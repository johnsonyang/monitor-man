const newman = require('newman')
  , newmanIntervalLogger = require('./log').get('newman')
  , intervalIds = require('./intervalIds')
  , redis = require('./redis')
  , date = require('date-and-time')
  , uuidv1 = require('uuid/v1')
  , safeEval = require('safe-eval');

// 开始使用newman调度执行测试用例集
const _newman = {

  runnewman: function (newmanOptions, collectionId) {
    // newmanOptions.

    // 发起newman执行逻辑
    newman.run(newmanOptions, async (err, summary) => {
      try {
        if (err) {
          this.stop(collectionId);
          newmanIntervalLogger.error(err);
          return;
        }

        newmanIntervalLogger.debug('run newman with options:\n', newmanOptions);

        // update run result
        let redisClient = redis.getConn();
        const _collectionInfo = await redisClient.hgetAsync('monitor-man-collection', collectionId);
        const collectionInfo = JSON.parse(_collectionInfo);
        if (collectionInfo === null) {
          newmanIntervalLogger.error("cannot get collection info "+ collectionId);
          this.stop(collectionId);
          return
        }

        // 中文
        newmanIntervalLogger.info('测试集[' + collectionInfo.name + '#' + collectionId + ']执行完毕!');

        // 保存执行结果信息 summary代表来自newman组件的信息...
        let _summary = {};
        // 开始时间
        const started = new Date(summary.run.timings.started);
        _summary['started'] = date.format(started, 'YYYY-MM-DD-HH-mm-ss');
        // 结束时间
        const completed = new Date(summary.run.timings.completed);
        _summary['completed'] = date.format(completed, 'YYYY-MM-DD-HH-mm-ss');
        // 本次执行耗时
        _summary['cost'] = summary.run.timings.completed - summary.run.timings.started;
        // johnson 开始与结束组成批次..

        const assertions = summary.run.stats.assertions;
        const testScripts = summary.run.stats.testScripts;
        _summary['assertions'] = {
          success: assertions.total - assertions.failed,
          failed: assertions.failed,
          failures: {},
        };
        _summary['testScripts'] = {
          success: testScripts.total - testScripts.failed,
          failed: testScripts.failed,
          failures: {},
        };

        // 准备写Redis存储
        let redisClientMulti = redisClient.multi();
        // 执行的错误信息,获取并重写为其他格式
        const failures = summary.run.failures;

        // 测试用例执行错误信息记录到Redis
        // note _failures是测试用例执行失败的信息记录
        // note 空对象 但是是个map, key:value[_failures[failures[i].cursor.ref]]
        let _failures = {};
        // failures 来自newman....
        if (failures.length > 0) {
          for (let i in failures) {
            if (_failures[failures[i].cursor.ref]) {
              // 有则追加
              _failures[failures[i].cursor.ref].failures.push(failures[i]);
            } else {
              // 没有则创建一个新的
              _failures[failures[i].cursor.ref] = {failures: [failures[i]], execution: null};
            }
          }
        }

        for (let i in summary.run.executions) {
          // note 此处记录数据库,针对测试用例API的执行

          // 单次执行结果
          const execution = summary.run.executions[i];
          const failureExecutions = _failures[execution.cursor.ref];
          if (!failureExecutions) continue;

          if (execution.response) {
            execution.response.stream = execution.response.stream.toString();
          }
          delete execution.cursor;
          // 一个执行对应多个错误,所以存储结构是多个错误对应一个执行
          failureExecutions.execution = execution;

          // johnson add 如何得知execution里面存在的信息? 看json...
          // execution.
          // johsnon add end

          // 全量执行信息
          const jsonExecution = JSON.stringify(execution);

          for (let index in failureExecutions.failures) {
            const failureExecution = failureExecutions.failures[index];
            // 获取名字 对应测试集的中文名字,--如钱有道1105
            const name = failureExecution.source.name;

            // 生成一个ID
            const failureId = uuidv1();


            // 断言错误   错误明细 _failureId是键,  也会记录到执行结果觉和信息的assertions上,json的数组
            if (failureExecution.at.indexOf('assertion') === 0) {
              // note 这个规则就是newman自定义的一个规则
              // note
              const _failureId = failureId + 'a' + i + index;
              // 设置key:value \"cf048d50-50ca-11eb-9f27-3d2e36cf3c84a10\":\"\xe9\x92\xb1\xe6\x9c\x89\xe9\x81\x931105\"
              _summary['assertions'].failures[_failureId] = name;
              // note 感觉这个Redis类型应用的不对
              // note 另外,需要每次都把jsonExecution放进来么? 放进来可以获取到错误的详细信息..便于回溯
              // hset 参数: key,subkey,value
              redisClientMulti = redisClientMulti
                  .hset('monitor-man-summary-failures-' + collectionId, _failureId, jsonExecution);
            }
            // 测试脚本错误 错误明细 _failureId是键,  也会记录到执行结果觉和信息的testScripts上,json的数组
            else if (failureExecution.at.indexOf('test-script') === 0) {
              const _failureId = failureId + 't' + i + index;
              _summary['testScripts'].failures[_failureId] = name;
              redisClientMulti = redisClientMulti
                  .hset('monitor-man-summary-failures-' + collectionId, _failureId, jsonExecution);
            }
          }
        } //end for (let i in summary.run.executions)






        collectionInfo['summary'] = _summary;
        // 执行信息存储到Redis
        redisClientMulti
            // monitor-man-summary-7518b160-50b4-11eb-8b2e-3f8787784fc8
            // zset 按照执行结束时间排序
            // note _summary的存储在后....
          .zadd('monitor-man-summary-' + collectionId, summary.run.timings.completed, JSON.stringify(_summary))
          .hset('monitor-man-collection', collectionId, JSON.stringify(collectionInfo))
          .exec(function (err, reply) {
            if (err) {
              newmanIntervalLogger.error(err);
            }
          });

        // alert failures
        if (collectionInfo.handler !== '' && failures.length > 0) {
          const handler = await redisClient.hgetAsync('monitor-man-handler', collectionInfo.handler);

          _failures = JSON.parse(JSON.stringify(_failures));

          if (handler) {
            const handlerParams = JSON.parse(collectionInfo.handlerParams);
            const request = require('postman-request');
            const sprintf = require("sprintf-js").sprintf;
            const vsprintf = require("sprintf-js").vsprintf;
            const redisClient = redis.getConn();
            const context = {
              console: console,
              failures: _failures,
              redis: redisClient,
              request: request,
              date: date,
              sprintf: sprintf,
              vsprintf: vsprintf,
              handlerParams: handlerParams,
            };
            const obj = JSON.parse(handler);
            if (obj) {
              safeEval(obj.code, context);
            }
          }
        }
      } catch (e) {
        newmanIntervalLogger.error(e);
      }
    } // 异步执行方法体
    ); // newman执行逻辑结束,报表的函数是哪个???
  }//run 方法定义
  ,
  stop: function (collectionId) {
    const i = intervalIds.get(collectionId);
    if (i) {
      clearInterval(i.intervalId);
      intervalIds.del(collectionId);
    }
  } //stop 方法定义
};

module.exports = _newman;
