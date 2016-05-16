(function() {
    function noop() {}

    /**
     * 自动回收的增量加载列表
     * @param options
     *      {
     *          //必须参数
     *          listDom:String,//列表容器的筛选名称
     *          dataLoader:Function(pageindex,success_calbak,error_calbak),//数据接口
     *          htmlRender:Function(data),//模版拼接,用户返回用模版绑定过的数据
     *          
     *          //可选参数
     *          pagesize:Number,//列表每页元素数量
     *          threshold:Number,//增量加载出发值,默认为300像素
     *          recycle:Boolean,//用户向上滑动列表,是否保留尾部的缓存数据
     *          customNomore:Function,//用户自定义空列表显示内容
     *          listLoading:Function,//列表加载中模版
     *          loadDone:Function//每页数据加载完成回调
     *
     *          //对外方法
     *          reloadData:Function,//刷新指定dom页的数据
     *          clear:Function//清空列表,并重新加载数据
     *      }
     */
    function infinitelist(options) {
        if (options) {
            this.setOptions(options);
        }
    }

    infinitelist.prototype = {
        setOptions: function(options) {
            this.dom = options.listDom || '';
            this.pagesize = options.pageSize || 10;
            this.threshold = options.threshold || 300;
            this._recycle = !!options.recycle;
            this.dataloader = options.dataLoader || noop;
            this.htmlrender = options.htmlRender || noop;
            this.customnomore = options.customNomore;
            this.loadDone = options.loadDone || noop;
            this.listLoading = options.listLoading || function() {
                return '<div>loading...</div>';
            }

            if (!this.dom) {
                console.warn('ListDom can not be null');
                return;
            }
            this._listContainer = $('<ul/>', { class: 'infinitelist-container' });
            //DOM 正在加载中
            this._loading = $(this.listLoading());
            //DOM 没有更多
            this._nomore = $(listnomore).hide();
            this._usernomore = $('<div/>');
            this._userdom = $(this.dom).append(this._listContainer).append(this._loading);
            this._pageListData = {};
            this._pageindex = 0;
            //是否正在render页面,如果在render页面则拒绝滚动事件
            this._renderingsign = false;
            this._nomoretag = false;

            this._initList();
        },
        _showNomore: function() {
            var _nomore = this.customnomore ? this.customnomore() : noop();

            if (_nomore) {
                this._usernomore = $(_nomore);
                this._userdom.append(this._usernomore);
            } else {
                this._nomore.show();
            }
        },
        //初始化列表,并绑定滚动事件
        _initList: function() {
            var _this = this;
            $(window).on('scroll', function() {
                var bottom = window.screen.height + window.scrollY;

                if (bottom >= _this._listContainer.height() - _this.threshold && !_this._renderingsign && !_this._nomoretag) {
                    _this._loadPage();
                }
                _this._updatePage();
            });
            _this._loadPage();
        },
        //增量加载更多页面
        _loadPage: function() {
            var _this = this;
            //正在加载页面,阻止其他的页面滚动请求
            _this._renderingsign = true;
            _this._pageindex++;
            _this._loading.hide();
            _this._getPageDom(_this._pageindex, function(renderhtml) {
                _this._listContainer.append($('<div/>', {
                    'class': 'infinitelist-page infinitelist-pageindex' + _this._pageindex,
                    'data-page': _this._pageindex
                }).append(renderhtml));
                //页面加载完成,可以接受后续请求
                _this._renderingsign = false;
                _this._loading.hide();
                _this.loadDone();
            });
        },
        //获取当前视窗页码
        _getPageItemOffset: function(pageheight) {
            return this._listContainer.scrollTop() === 0 ? 0 : Math.floor((this._listContainer.scrollTop() + window.screen.height / 2) / pageheight);
        },
        //更新页面,并回收页面
        _updatePage: function() {
            var pages = this._listContainer.find('.infinitelist-page'),
                curindex = this._getPageItemOffset(pages.first().height()),
                firstpage = pages.first().data('page'),
                curpage = curindex + firstpage;
            //先回收页面
            this._recyclePage(pages.slice(0, curpage > 2 ? curpage - 2 : 0), pages.slice(curpage > 2 ? curpage + 2 : 0, curpage > 2 ? this._pageindex : 0));
            //恢复页面
            this._resumePage(pages.slice(curpage > 2 ? curpage - 2 : 0, curpage + 2));
        },
        _getPageDom: function(pageindex, calbak) {
            var _this = this;
            _this._getData(pageindex, function(data) {
                calbak(_this.htmlrender(data));
            });
        },
        _getData: function(pageindex, calbak) {
            var _this = this;
            //如果缓存中存在数据则直接取缓存中的数据,没有请求服务器,并保存在缓存中
            if (_this._pageListData[pageindex]) {
                calbak(_this._pageListData[pageindex]);
            } else {
                _this._loading.show();
                _this.dataloader(pageindex, function success(datalist) {
                    if (_this._pageindex === 1 && datalist.length == 0) {
                        _this._loading.hide();
                        _this._showNomore();
                        _this._nomoretag = true;
                    }
                    if (datalist.length < _this.pagesize) {
                        _this._nomoretag = true;
                    }
                    _this._pageListData[pageindex] = datalist;
                    calbak(datalist);
                }, function error() {
                    calbak([]);
                });
            }
        },
        _resumePage: function(pages) {
            var _this = this;
            pages.each(function() {
                var _dom = $(this);
                if (_dom.hasClass('recycle')) {
                    _this._getPageDom(_dom.data('page'), function(renderhtml) {
                        _dom.append(renderhtml);
                        _dom.css('height', 'auto');
                        _dom.removeClass('recycle');
                        _this.loadDone();
                    });
                }
            });
        },
        //回收当前页上方2页之前的DOM,并删除当前页下方2页之后的DOM
        _recyclePage: function(recyclepages, deletepages) {
            recyclepages.each(function() {
                var _dom = $(this);
                if (!_dom.hasClass('recycle')) {
                    _dom.addClass('recycle');
                    _dom.css('height', _dom.height() + 'px');
                    _dom.html('');
                }
            });

            //是否回收列表数据
            if (this._recycle) {
                deletepages.each(function() {
                    var _dom = $(this),
                        _index = _dom.data('page');

                    delete this._pageListData[_index];
                });
            }

            //尾部的页面删除
            deletepages.remove();
        },
        //删除指定页面的数据
        reloadData: function(elem) {
            var _this = this,
                page = _this._listContainer.find(elem),
                curindex = page.length ? page.parents('.infinitelist-page').data('page') : 0;

            if (curindex > 0) {
                //删除当前页数据
                delete _this._pageListData[curindex];
                _this._getPageDom(curindex, function(renderhtml) {
                    $('.infinitelist-pageindex' + curindex).html(renderhtml);
                    _this._loading.hide();
                });
            }
        },
        //清空当前页面状态,重新加载数据
        clear: function() {
            this._listContainer.empty();
            this._pageindex = 0;
            this._pageListData = {};
            this._nomoretag = false;
            this._nomore.hide();
            this._usernomore.remove();
            this._loadPage();
        }
    };

    window.InfiniteList = infinitelist;
})();
