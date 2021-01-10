<template>
  <div style="margin-bottom: 50px;">
    <h3 style="background-color: #f8f8f8;line-height: 3.5;text-align: center;"><span style="color: red;">创建用例集合</span></h3>
    <p>请查看 <a href="https://github.com/postmanlabs/newman#newmanrunoptions-object--callback-function--run-eventemitter">newman.run选项</a>
      获取更多配置信息
    </p>
    <form v-on:submit.prevent="submit">
      <div class="form-group row">
        <label class="col-2 col-form-label">环境标签</label>
        <input v-model="form.tag" type="text" class="col-10 form-control">
        <small class="col-12 form-text text-muted">可以通过标签来管理用例集合,使用英文逗号','为这个用例集合配置多个标签</small>
      </div>
      <div class="form-group row">
        <label class="col-2 col-form-label">保留天数</label>
        <input v-model="form.reserved" type="text" class="col-10 form-control">
        <small class="col-12 form-text text-muted">Postman用例集合执行结果的保留天数</small>
      </div>
      <div class="form-group row">
        <label class="col-2 col-form-label">用例集合</label>
        <input v-on:change="uploadFile($event, 'collection')" class="col-10" type="file" name="collection-file">
        <small class="col-12 form-text text-muted">上传Postman用例集合JSON文件</small>
      </div>
      <div class="form-group row">
        <label class="col-2 col-form-label">执行间隔(ms)</label>
        <input v-model="form.interval" type="text" class="col-10 form-control">
        <small class="col-12 form-text text-muted">用例集合的执行调度窗口间隔</small>
      </div>
      <div class="form-group row">
        <label class="col-2 col-form-label">请求超时时间(ms)</label>
        <input v-model="form.timeoutRequest" type="text" class="col-10 form-control">
        <small class="col-12 form-text text-muted">配置0代表不超时</small>
      </div>
      <div class="form-group row">
        <label class="col-2 col-form-label">请求延迟时间(ms)</label>
        <input v-model="form.delayRequest" type="text" class="col-10 form-control">
        <small class="col-12 form-text text-muted">请求延迟时间(ms)</small>
      </div>
      <div class="form-group row">
        <label class="col-2 col-form-label">迭代次数</label>
        <input v-model="form.iterationCount" type="text" class="col-10 form-control">
        <small class="col-12 form-text text-muted">用例执行周期内的迭代次数,默认为1次</small>
      </div>
      <div class="form-group">
        <label>迭代数据文件</label>
        <input v-on:change="uploadFile($event, 'iterationData')" type="file">
        <small class="form-text text-muted">在用例集合上运行多个迭代时，将JSON或CSV文件用作数据源</small>
      </div>
      <div class="form-group">
        <label>环境文件</label>
        <input v-on:change="uploadFile($event, 'environment')" type="file">
        <small class="form-text text-muted">上传Postman导出的环境(environment)文件</small>
      </div>
      <div class="form-group row">
        <label class="col-2 col-form-label">错误处理器</label>
        <select class="col-2 form-control" v-model="form.handler" style="width: auto">
          <option value=""></option>
          <option :value="handler.id" v-for="handler in handlers">{{handler.name}}</option>
        </select>
        <small class="col-12 form-text text-muted">错误处理器(例如发送某些报警)</small>
      </div>
      <div class="form-group">
        <label>错误处理器执行参数</label>
        <textarea v-model="form.handlerParams" class="form-control" rows="5"></textarea>
        <small class="form-text text-muted">传给给错误处理器的参数，必须是Json格式的字符串</small>
      </div>
      <div class="checkbox">
        <input v-model="form.ignoreRedirects" type="checkbox"> 忽略重定向
        <small class="text-muted">(勾选代表是否将自动遵循服务器的3xx响应)</small>
      </div>
      <div class="checkbox">
        <input v-model="form.insecure" type="checkbox"> 安全禁用
        <small class="text-muted">(勾选代表禁用SSL验证检查并允许自签名SSL证书)</small>
      </div>
      <div class="checkbox">
        <label>
          <input v-model="form.bail" type="checkbox"> 执行保护
          <small class="text-muted">(勾选代表是否在遇到第一个错误时正常停止执行用例集合)</small>
        </label>
      </div>
      <button type="submit" class="btn btn-primary mm-click">新增</button>
    </form>
  </div>
</template>

<script>
  export default {
    name: 'collectionCreate',
    data() {
      return {
        handlers: [],
        form: {
          reserved: 3,
          interval: 60000,
          timeoutRequest: 0,
          delayRequest: 0,
          iterationCount: 1,
          ignoreRedirects: true,
          insecure: false,
          bail: false
        },
      }
    },
    created() {
      const uri = '/handler';
      this.$http.get(uri)
        .then(resp => {
          this.handlers = resp.data;
        }).catch(error => {
        this.$bus.$emit('error', 'HTTP请求为: ' + uri, error.message)
      });
    },
    methods: {
      uploadFile: function (e, type) {
        if (type === 'collection') {
          this.form['collection'] = e.target.files[0];
          return
        }
        if (e.target.files[0]) {
          this.form[type] = e.target.files[0];
        } else {
          delete this.form[type];
        }
      },
      submit: function () {
        let formData = new FormData();
        for (let key in this.form) {
          formData.append(key, this.form[key])
        }
        const uri = '/collection';
        this.$http.post(uri, formData)
          .then(() => {
            this.$router.push('/');
          }).catch(error => {
            this.$bus.$emit('error', 'HTTP请求为: ' + uri + error.message, error.response.data)
        });
      }
    }
  }
</script>
