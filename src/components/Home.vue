<template>
  <div>
    <div style="text-align: center">
      <div class="card" v-for="item in items">
        <h5 class="card-header" style="color: #308ede;">
          <router-link :to="{ name: 'CollectionShow', params: {id: item.id} }">
            {{item.name}}
          </router-link>
          <span class="badge badge-default" style="margin: 0 5px;" v-for="tag in item.tag">{{tag}}</span>
          <span v-on:click="showConfirm('删除用例集合', '确定删除用例集合 '+item.name, item.id, remove)" class="mm-click" style="float: right;margin-left: 10px;">
        <icon name="remove"></icon>
        </span>
          <router-link :to="{ name: 'CollectionUpdate', params: {id: item.id} }" style="float: right;">
            <icon name="edit"></icon>
          </router-link>
        </h5>
        <div class="card-block">
          <p class="card-text" v-if="item.description">{{item.description}}</p>
            <div :class="{ 'collection-warn': item.summary && (item.summary.assertions.failed > 0 || item.summary.testScripts.failed > 0) }">
              <span v-if="item.status == 'running' && item.summary">
                <button class="btn btn-success btn-sm mm-click" v-on:click="showConfirm('变更用例集合状态', '暂停执行 '+item.name, {id: item.id, status: 'stop'},
                setStatus)">
                  运行中
                </button>
              </span>
              <span v-if="item.status == 'running' && !item.summary">
                <button class="btn btn-warning btn-sm mm-click" v-on:click="showConfirm('变更用例集合状态', '暂停执行 '+item.name, {id: item.id, status: 'stop'}, setStatus)">
                  运行中
                </button>
              </span>
              <span v-if="item.status == 'stop'">
                <button class="btn btn-danger btn-sm mm-click" v-on:click="showConfirm('变更用例集合状态', '开始执行 '+item.name,
                {id: item.id, status: 'running'}, setStatus)">
                  已暂停
                </button>
              </span>
              <span>
                <button class="btn btn-primary btn-sm" disabled="disabled" v-if="item.summary">
                  耗费 <span class="badge my-badge-primary badge-pill">{{item.summary.cost}}ms</span>
                </button>
              </span>
              <span>
                <button class="btn btn-primary btn-sm" disabled="disabled" v-if="item.summary">
                  执行周期 <span class="badge my-badge-primary badge-pill">{{item.summary.started}} - {{item.summary.completed}}</span>
                </button>
              </span>
              <!--<span>
                <button class="btn btn-default btn-sm" disabled="disabled" v-if="item.summary">
                  {{item.summary.started}} - {{item.summary.completed}}
                </button>
              </span>-->
              <span>
                <button class="btn btn-success btn-sm" disabled="disabled" v-if="item.summary">
                  断言成功 <span class="badge my-badge-success badge-pill">{{item.summary.assertions.success}}</span>
                </button>
              </span>
              <span>
                <button class="btn btn-danger btn-sm" disabled="disabled" v-if="item.summary && item.summary.assertions.failed == 0">
                  断言失败 <span class="badge my-badge-danger badge-pill">{{item.summary.assertions.failed}}</span>
                </button>
                <button class="btn btn-danger btn-sm mm-click" v-on:click="showFailures(item.id, item.summary.assertions.failures, 'Assertions Failures')" v-else-if="item.summary">
                  断言失败 <span class="badge my-badge-danger badge-pill">{{item.summary.assertions.failed}}</span>
                </button>
              </span>
              <span>
                <button class="btn btn-success btn-sm" disabled="disabled" v-if="item.summary">
                  断言脚本正确 <span class="badge my-badge-success badge-pill">{{item.summary.testScripts.success}}</span>
                </button>
              </span>
              <span>
                <button class="btn btn-danger btn-sm" disabled="disabled" v-if="item.summary && item.summary.testScripts.failed == 0">
                  断言脚本错误 <span class="badge my-badge-danger badge-pill">{{item.summary.testScripts.failed}}</span>
                </button>
                <button class="btn btn-danger btn-sm mm-click" v-on:click="showFailures(item.id, item.summary.testScripts.failures, 'TestScripts Failures')" v-else-if="item.summary">
                  断言脚本错误 <span class="badge my-badge-danger badge-pill">{{item.summary.testScripts.failed}}</span>
                </button>
              </span>
            </div>
        </div>
      </div>
    </div>
    <modal :collectionInfo="modal.collectionInfo" :title="modal.title" :show="modal.show" :failures="modal.failures" v-on:close="modal.show = false"></modal>
    <confirm-modal :title="confirmModal.title" :show="confirmModal.show" :message="confirmModal.message" v-on:close="confirmModal.show = false" v-on:confirm="confirmModal.callback(confirmModal)"></confirm-modal>
  </div>
</template>

<script>
  import Modal from './modal/JsonViewModal'
  import ConfirmModal from './modal/ConfirmModal'
  export default {
    name: 'home',
    components: {
      Modal,
      ConfirmModal
    },
    data () {
      return {
        items: [],
        modal: {
          show: false
        },
        confirmModal: {
          show: false,
          data: null
        },
        tag: ''
      }
    },
    created() {
      this.$bus.$on('tag', tag => {
        this.$cookie.set('tag', tag, 30);
        this.fetchData(tag);
      });
    },
    methods: {
      fetchData(tag) {
        this.tag = tag;
        let uri = '/collection';
        if (tag !== '') {
          uri += '/tag/' + tag;
        }
        this.$http.get(uri).then(resp => {
          this.items = resp.data;
        }).catch(error => {
          this.$bus.$emit('error', 'HTTP请求为: ' + uri, error.message);
        });
      },
      showFailures(id, failures, title) {
        this.modal.failures = failures;
        this.modal.show = true;
        this.modal.title = title;
        this.modal.collectionInfo = {
          id: id,
        };
      },
      showConfirm(title, message, data, callback) {
        this.confirmModal = {
          title: title,
          message: message,
          show: true,
          data: data,
          callback: callback
        };
      },
      remove(confirmModal) {
        confirmModal.show = false;
        const uri = '/collection/'+confirmModal.data;
        this.$http.delete(uri)
          .then(() => {
            this.fetchData(this.tag);
          }).catch(error => {
            this.$bus.$emit('error', 'HTTP请求为: ' + uri, error.message);
          });
      },
      setStatus(confirmModal) {
        confirmModal.show = false;
        const data = confirmModal.data;
        const uri = '/collection/'+data.id+'/'+data.status;
        this.$http.post(uri)
          .then(() => {
            this.fetchData(this.tag);
          }).catch(error => {
            this.$bus.$emit('error', 'HTTP请求为: ' + uri, error.message);
          });
      }
    },
    beforeDestroy () {
      this.$bus.$off('tag');
    }
  }
</script>

<style lang="stylus" scoped>
  a
    text-decoration: none
  .card
    display: inline-block
    margin-bottom: 20px
    text-align: initial
    min-width: 70.6%
  .my-badge-primary
    color: #337ab7
    background-color: #fff
  .my-badge-success
    color: #5cb85c
    background-color: #fff
  .my-badge-danger
    color: #d9534f
    background-color: #fff
  .btn-sm
    font-size: 0.76rem
  .btn-default
    color: #333
    background-color: #fff
    border-color: #ccc
  .collection-warn
    background-color: #ffd0d0
  button
    margin: 0.5rem
</style>
