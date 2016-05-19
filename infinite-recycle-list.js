(function() {
    function noop() {}

    /**
     * 自动回收的增量加载列表
     * @param options
     *      {
     *          //必须参数
     *          listDom:String,//列表容器的筛选名称
     *          dataLoader:Function(pageindex,success_calbak,error_calbak),//数据接口
     *          pageSize:Number,//列表有无更多
     *          htmlRender:Function(data),//模版拼接,用户返回用模版绑定过的数据
     *          
     *          //可选参数
     *          threshold:Number,//增量加载出发值,默认为300像素
     *          pageKeepSize:Number,//保持的DOM数量,最低为2(建议为偶数),默认为6
     *          recycle:Boolean,//用户向上滑动列表,是否保留尾部的缓存数据,默认为false
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
            this.pagesize = options.pageSize;
            this.dataloader = options.dataLoader || noop;
            this.htmlrender = options.htmlRender || noop;

            this.threshold = options.threshold || 300;
            this._listPageKeepLength = options.pageKeepSize >= 2 ? options.pageKeepSize : 6;
            this._recycle = !!options.recycle;
            this.loadDone = options.loadDone || noop;
            //没有更多
            this._nomore = options.customNomore || function() {
                return '<div></div>';
            };
            this.nomore = undefined;
            this.listLoading = options.listLoading || function() {
                return '<div>loading...</div>';
            };

            if (!this.dom) {
                console.warn('ListDom can not be null');
                return;
            }

            if (this.pagesize === undefined) {
                console.warn('PageSize can not be null');
                return;
            }
            //列表容器
            this._listContainer = $('<ul/>', { class: 'infinitelist-container' });
            //DOM 正在加载中
            this._loading = $(this.listLoading());
            this._userdom = $(this.dom).append(this._listContainer).append(this._loading);
            this._pageListData = {};
            this._pageindex = 0;
            //是否正在render页面,如果在render页面则拒绝滚动事件
            this._renderingsign = false;
            this._nomoretag = false;

            this._initList();
        },
        _showNomore: function() {
            this.nomore = $(this._nomore()).show();
            this._userdom.append(this.nomore);
        },
        //初始化列表,并绑定滚动事件
        _initList: function() {
            var _this = this;

            function listener() {
                var bottom = window.innerHeight + window.scrollY;
                if (bottom >= _this._listContainer.height() - _this.threshold && !_this._renderingsign && !_this._nomoretag) {
                    _this._loadPage();
                }
                _this._updatePage();
            }
            $(window).on('scroll', listener);
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
            var curScroll = document.body.scrollTop;
            return curScroll === 0 ? 0 : Math.floor((curScroll - this._listContainer.offset().top + window.innerHeight / 2) / pageheight);
        },
        //更新页面,并回收页面
        _updatePage: function() {
            var pages = this._listContainer.find('.infinitelist-page'),
                curindex = this._getPageItemOffset(pages.first().height()),
                firstpage = pages.first().data('page'),
                curpage = curindex + firstpage,
                keepsize = Math.floor(this._listPageKeepLength / 2);
            if (pages.length > this._listPageKeepLength) {
                //先回收页面,再恢复页面
                var startindex = ((curpage + keepsize) > pages.length) ? curpage - 2 * keepsize : curpage - keepsize;
                this._recyclePage(pages.slice(0, startindex),
                    pages.slice(curpage + keepsize, pages.length));
                this._resumePage(pages.slice(startindex, curpage + keepsize));
            } else {
                this._resumePage(pages);
            }
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
        _recyclePage: function(recyclepages, deletepages) {
            var _this = this;

            recyclepages.each(function() {
                var _dom = $(this);
                if (!_dom.hasClass('recycle')) {
                    _dom.addClass('recycle');
                    _dom.css('height', _dom.height() + 'px');
                    _dom.html('');
                }
            });

            //是否回收列表数据

            deletepages.each(function() {
                var _dom = $(this),
                    _index = _dom.data('page');

                if (_this._pageindex >= ~~_dom.data('page')) {
                    _this._pageindex = ~~_dom.data('page') - 1;
                }
                if (_this._recycle) {
                    delete _this._pageListData[_index];
                }
            });

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
            if (this.nomore) {
                this.nomore.remove();
            }
            this._loadPage();
        }
    };

    window.InfiniteList = infinitelist;
})();
