(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['Zepto'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('Zepto'));
  } else {
    root.InfiniteList = factory(root.Zepto);
  }
})(this, function ($) {
  function noop() {
  }

  function _isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }

  /**
   *
   * @param options
   * {
     *      //options(require)
     *      listId:String,  //Id of list container.
     *      dataLoader:Function(pageindex,pagesize,success_calbak,err_calbak),   //Function of data provider.
     *      htmlRender:Function(data,calbak)    //Template render,calbak with html string after finish render.
     *
     *      //options(optional)
     *      pageSize:Number,    //List item count of each page,default 10.
     *      threshold:Number,   //Infinite load trigger pixel height,default 300 pixel(should large than 300).
     *      pageKeepSize:Number,    //Dom count keep in page which not be recycled,default 6(minimum of 2,should be
     *     even number).
     *      recycle:Boolean,    //Should list keep bottom data in cache,defaule false.
     *      pageCache:Boolean,  //Should list cache current page data if page changed,this would resume page when
     *     reload,default false.
     *      listNomore:Function,  //Return html string that used for list with no data.
     *      listLoading:String,   //Html string that used for list bottom loading tag.
     *      loadDone:Function,  //Triggered when each page finish loading.
     *      storageName:String  //List data stored in sessionStorage with the given name,default INFINITELISTCACHE.
     * }
   *
   * @method public
   *
   * reloadData:Function, //Reload page data.
   * clear:Function,  //Clear list data.
   */
  var infinitelist = function _infinitelist(options) {
    if (!options) {
      console.warn('Infinitelist init options can not be null!');
      return;
    }
    this._setOptions(options);
  };

  infinitelist.prototype = {
    _setOptions: function (options) {
      if (!options.listId) {
        console.warn('Options-listId can not be null!');
        return;
      }
      if (!options.dataLoader) {
        console.warn('Options-dataLoader can not be null!');
        return;
      }
      if (!options.htmlRender) {
        console.warn('Options-htmlRender can not be null!');
        return;
      }

      var _listId = options.listId.indexOf('#') > -1 ? options.listId : '#' + options.listId;
      this._listWrap = $(_listId);
      this._dataLoader = options.dataLoader;
      this._htmlRender = options.htmlRender;

      this._pageSize = options.pageSize || 10;
      this._threshold = options.threshold || 300;
      this._pageKeepSize = options.pageKeepSize || 6;
      this._recycle = !!options.recycle;
      this._pageCache = !!options.pageCache;
      this._listNomore = options.listNomore || function () {
          return '<div style="text-align:center;padding:10px 0;">No more</div>';
        };
      this._listLoading = $(options.listLoading || '<div style="text-align: center;padding: 10px 0;">Loading...</div>');
      this._loadDone = options.loadDone || noop;
      this._cacheKey = options.storageName || 'INFINITELISTCACHE';

      this._pageIndex = 1;
      this._pageListData = {};
      //Block sign,when page is rendering block scroll listener.
      this._sign_rendering = false;
      this._sign_nomore = false;

      this._initList();
    },
    _initList: function () {
      var self = this;
      self._listContainer = $('<div/>', {
        class: 'infinitelist-container'
      });
      self._listWrap.append(self._listContainer).append(self._listLoading);

      function listener() {
        var bottom = self._listContainer.height() + self._listContainer.offset().top;
        if ((self._threshold > bottom - window.scrollY - window.innerHeight) && !self._sign_rendering && !self._sign_nomore) {
          self._loadPage();
        }
        self._updatePage(function () {
          if (self._pageCache) {
            self._cacheData();
          }
          self._loadDone();
        });
      }

      if (self._pageCache) {
        self._resumeData();
      } else {
        self._loadPage();
      }

      //先处理内容 然后在绑定事件
      $(window).on('scroll', function (event) {
        var self = this;
        setTimeout(function () {
          listener.call(self, event);
        });
      });
    },
    _resumeData: function () {
      var self = this;

      function getPage(index, page, calbak) {
        var _dom = $('<div/>', {
          'class': 'infinitelist-page infinitelist-pageindex' + index + ' clearfix',
          'data-page': index
        });
        if (page.cycled) {
          calbak(_dom.addClass('recycled').css('height', page.data));
        } else {
          self._pageListData[index] = page.data;
          if (page.data.length < self._pageSize) {
            self.noMore();
          }
          self._getPageDom(index, function (_renderhtml) {
            calbak(_dom.html(_renderhtml));
          });
        }
      }

      if (sessionStorage) {
        var _pagedata = sessionStorage.getItem(this._cacheKey);
        if (_pagedata) {
          var _cacheData = JSON.parse(_pagedata),
              _list      = _cacheData.list,
              _position  = parseFloat(_cacheData.position),
              proname;
          for (proname in _list) {
            if (_list.hasOwnProperty(proname)) {
              var _item    = _list[proname],
                  _proname = parseInt(proname);
              getPage(_proname, _item, function (dom) {
                self._listContainer.append(dom);
              });
              self._pageIndex = _proname + 1;
            }
          }
          sessionStorage.removeItem(self._cacheKey);
          self._loadDone();
          setTimeout(function () {
            window.scrollTo(0, _position);
          });
          return;
        }
      }
      this._loadPage();
    },
    _cacheData: function () {
      if (sessionStorage) {
        var _tempCache,
            _list = {},
            self  = this;
        $('.infinitelist-page').each(function () {
          var _pageindex = $(this).data('page'),
              _cycled    = $(this).hasClass('recycled');
          _list[_pageindex] = {
            cycled: _cycled,
            data: _cycled ? $(this).css('height') : self._pageListData[_pageindex]
          };
        });
        _tempCache = {
          position: window.scrollY,
          list: _list
        };
        sessionStorage.setItem(self._cacheKey, JSON.stringify(_tempCache));
      }
    },
    _loadPage: function () {
      var self      = this,
          pageindex = self._pageIndex++;
      //正在加载页面,阻止其他的页面滚动请求
      self._sign_rendering = true;
      self._getPageDom(pageindex, function (_renderhtml) {
        if (_renderhtml) {
          self._listContainer.append($('<div/>', {
            'class': 'infinitelist-page infinitelist-pageindex' + pageindex + ' clearfix',
            'data-page': pageindex
          }).html(_renderhtml));
          self._sign_rendering = false;
        }
        self._loadDone();
      });
    },
    _getPageItemOffset: function (pageheight) {
      var curpage = (window.scrollY + window.innerHeight / 2 - this._listContainer.offset().top) / pageheight;

      return {
        min: Math.floor(curpage),
        max: Math.ceil(curpage)
      };
    },
    _updatePage: function (calbak) {
      var pages    = this._listContainer.find('.infinitelist-page'),
          curpage  = this._getPageItemOffset(pages.first().height()).max,
          keepsize = Math.ceil(this._pageKeepSize / 2);
      if (pages.length > this._pageKeepSize) {
        this._recyclePage(pages.slice(0, curpage - keepsize), pages.slice(curpage + keepsize, pages.length));
        this._resumePage(pages.slice(curpage > keepsize ? (curpage - keepsize) : 0, curpage + keepsize));
      } else {
        this._resumePage(pages);
      }
      calbak();
    },
    _resumePage: function (pages) {
      var self = this;
      pages.each(function () {
        var _dom = $(this);
        if (_dom.hasClass('recycled')) {
          self._getPageDom(_dom.data('page'), function (_renderhtml) {
            _dom.html(_renderhtml);
            _dom.css('height', 'auto');
            _dom.removeClass('recycled');
          });
        }
      });
    },
    _recyclePage: function (recyclepages, deletepages) {
      var self     = this,
          delpages = [];
      recyclepages.each(function () {
        var _dom = $(this);
        if (!_dom.hasClass('recycled')) {
          _dom.addClass('recycled');
          _dom.css('height', _dom.height());
          _dom.html('');
        }
      });

      deletepages.each(function () {
        var _dom   = $(this),
            _index = _dom.data('page');
        delpages.push(_index);
        if (self._recycle) {
          delete self._pageListData[_index];
        }
      });

      if (delpages.length > 0) {
        self._pageIndex = delpages.reduce(function (prev, cur) {
          return prev > cur ? cur : prev;
        });
      }

      deletepages.remove();
    },
    _getPageDom: function (pageindex, calbak) {
      var self = this;
      self._getData(pageindex, function (data) {
        calbak(self._htmlRender(data));
      });
    },
    _getData: function (pageindex, calbak) {
      var self = this;
      //如果缓存中存在数据则直接取缓存中的数据,没有请求服务器,并保存在缓存中
      if (self._pageListData[pageindex]) {
        calbak(self._pageListData[pageindex]);
      } else {
        self._dataLoader(pageindex, self._pageSize, function success(datalist) {
          if (pageindex === 1 && (!datalist || !datalist.length)) {
            self._listContainer.append($(self._listNomore()));
          }
          if ((_isArray(datalist) && datalist.length < self._pageSize) || !datalist) {
            self.noMore();
          }
          if ((_isArray(datalist) && datalist.length != 0) || (!_isArray(datalist) && !datalist)) {
            self._pageListData[pageindex] = datalist;
          }
          calbak(datalist);
        }, function error() {
          if (pageindex === 1) {
            self._listContainer.append($(self._listNomore()));
          }
          self.noMore();
          calbak([]);
        });
      }
    },
    reloadData: function () {
      var self     = this,
          curpages = self._getPageItemOffset($('.infinitelist-page').first().height());
      console.log(curpages);
      if (curpages.min >= 0 && curpages.max > 0) {
        delete self._pageListData[curpages.min];
        delete self._pageListData[curpages.max];
        if (curpages.max === curpages.min) {
          self._sign_rendering = true;
          self._getPageDom(curpages.min, function (_renderhtml) {
            $('.infinitelist-pageindex' + curpages.min).html(_renderhtml);
            self._sign_rendering = false;
            self._loadDone();
          });
        } else {
          self._sign_rendering = true;
          self._getPageDom(curpages.min, function (_renderhtml) {
            $('.infinitelist-pageindex' + curpages.min).html(_renderhtml);
            self._sign_rendering = false;
            self._loadDone();
          });
          self._getPageDom(curpages.max, function (_renderhtml) {
            $('.infinitelist-pageindex' + curpages.max).html(_renderhtml);
            self._sign_rendering = false;
            self._loadDone();
          });
        }

      }
    },
    noMore: function () {
      this._sign_nomore = true;
      this._listLoading.hide();
    },
    clear: function () {
      this._listContainer.empty();
      this._listLoading.show();
      this._pageIndex = 1;
      this._pageListData = {};
      this._sign_nomore = false;
      this._sign_rendering = false;
      this._loadPage();
    }
  };

  return infinitelist;
});
