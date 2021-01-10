const redis = require('./redis')
  , logger = require('./log').get('sync')
  , intervalIds = require('./intervalIds')
  , fs = require('fs')
  , Collection = require('postman-collection').Collection
  , newmanlocal = require('./newman');

const _sync = {
  run: async function() {
    try {
      let redisClient = redis.getConn();
      const collectionInfos = await redisClient.hgetallAsync('monitor-man-collection');

      //Johnson note intervalIds就是一个corn,也类似于fixedrate触发器
      for (let id in collectionInfos) {
        let collectionInfo = JSON.parse(collectionInfos[id]);

        // clean failures
        this.rotateSummaries(id, collectionInfo.reserved);

        const i = intervalIds.get(id);

        // if the collection has been stop
        if (collectionInfo.status === 'stop') {
          if (i) {
            clearInterval(i.intervalId);
            intervalIds.del(id);
          }
          continue;
        }

        // if the collection hasn't been run or collection has been update
        if (i === undefined || i.ts < collectionInfo.timestamp) {
          if (i) {
            clearInterval(i.intervalId);
            intervalIds.del(id);
          }
          const collectionFileData = await redisClient.hgetAsync('monitor-man-collectionFile', id);
          if (!collectionFileData) {
            logger.error(collectionInfo.name + '#' + id + '测试集定义文件丢失!');
            continue;
          }
          if (!fs.existsSync(collectionInfo.collectionFile)) {
            fs.writeFileSync(collectionInfo.collectionFile, collectionFileData)
          }
          // options.collection
          const cObj = new Collection(JSON.parse(collectionFileData));
          // note Object.assign方法的第一个参数是目标对象，后面的参数都是源对象。
          let newmanOption = Object.assign({
            // * @param {Collection|Object|String} options.collection - A JSON / Collection / String representing the collection.
            collection: cObj,
            // 此处添加reporter相关
            // * @param {Object|String} options.reporters - A set of reporter names and their associated options for the current run.
            // their associated options for the current run.
            // note johnson add influxdb 需要配置.... newman-reporter-influxdb
            // newman run https://www.getpostman.com/collections/631643-f695cab7-6878-eb55-7943-ad88e1ccfd65-JsLv -r influxdb \
            // --reporter-influxdb-server localhost \
            // --reporter-influxdb-port 8086 \
            // --reporter-influxdb-name newman_reports \
            // --reporter-influxdb-measurement api_results
            // This reporter currently uses InfluxDB HTTP APIs to send data[InfluxDB v1.7]
            // todo 'influxdb', Johnson 自己打包 'jiniuinfluxdb'
            // csv work!!
            reporters: ['jiniuinfluxdb'],
            abortOnError: true
          }, collectionInfo.newmanOption);
          if (newmanOption.timeoutRequest === 0) {
            delete newmanOption.timeoutRequest;
          }

          let path;
          if (collectionInfo.iterationData) {
            const iterationData = await redisClient.hgetAsync('monitor-man-iterationData', id);
            if (iterationData) {
              path = collectionInfo.iterationData.path;
              if (!fs.existsSync(path)) {
                fs.writeFileSync(path, iterationData);
              }
              newmanOption.iterationData = path;
            }
          }
          if (collectionInfo.environment) {
            const environment = await redisClient.hgetAsync('monitor-man-environment', id);
            if (environment) {
              path = collectionInfo.environment.path;
              if (!fs.existsSync(path)) {
                fs.writeFileSync(path, environment);
              }
              newmanOption.environment = path;
            }
          }
          const intervalId = this.setInterval(newmanOption, id, collectionInfo.interval);
          intervalIds.add(id, intervalId, collectionInfo.timestamp);
          logger.info("恢复执行测试集 ["+collectionInfo.name+"#" + id+"]");
        }
      }
    } catch (e) {
      logger.error("出现异常:",e);
    }
  },
  // setInterval方法, interval 是时间间隔..
  setInterval: function(newmanOption, id, interval) {
    return setInterval(function () {
      newmanlocal.runnewman(newmanOption, id);
    }, interval);
  },
  // rotateSummaries方法
  rotateSummaries: async function(collectionId, reserved) {
    let redisClient = redis.getConn();
    const now = Date.now();
    const summaries = await redisClient.zrangebyscoreAsync('monitor-man-summary-' + collectionId, 0, now-reserved*24*3600*1000);
    const failuresKey = 'monitor-man-summary-failures-' + collectionId;
    for (let index in summaries) {
      const _summaries = JSON.parse(summaries[index]);
      for (let failureId in _summaries.assertions.failures) {
        await redisClient.hdelAsync(failuresKey, failureId);
      }
      for (let failureId in _summaries.assertions.failures) {
        await redisClient.hdelAsync(failuresKey, failureId);
      }
    }
    await redisClient.zremrangebyscoreAsync('monitor-man-summary-' + collectionId, 0, now-reserved*24*3600*1000);
  }
};

module.exports = _sync;
