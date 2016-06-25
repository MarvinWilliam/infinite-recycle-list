#infinite-recycle-list

根据淘宝移动端增量加载列表改造而来,实现列表的增量加载,并对超出屏幕的列表页进行回收.

依赖于zepto或者jquery.

##Install
```
$ bower install infinite-recycle-list --save
```

##Example

[Demo](http://marvinwilliam.com/infinite-recycle-list/)

```javascript
var _list = new InfiniteList({
  //必须,列表容器的选择器
  listId:'list-container',
  //必须,每页的大小,控制是否可以加载更多,和dataLoader里的页面大小需要保持一致
  pageSize:10,
  //必须,数据加载函数
  dataLoader:function(pageindex,pagesize,success_calbak,error_calbak){
    $.ajax({
      url:'...',
      type:'post',
      data:{
        ...
        pageindex:pageindex,
        pagesize:pagesize
      },
      success:function(data){
        success_calbak(data.list);
      },
      error:error_calbak
    });
  },
  //必须,将数据绑定到模板
  htmlRender:function(data){
    return 'template-rendered';
  },
  //增量加载触发值,默认为300像素,最低为300
  threshold:400,
  //保持的DOM数量,最低为2(建议为偶数),默认为6
  pageKeepSize:6,
  //用户向上滑动列表,是否保留尾部的缓存数据,默认为false
  recycle:true,
  //是否缓存页面锚点位置
  pageCache:true,
  //缓存名称,默认为INFINITELISTCACHE,缓存页面锚点时数据缓存在sessionStorage中的名称
  storageName:'storageName',
  
  //可选,用户自定义列表没有更多显示的内容
  listNomore:function(){
    return '<div>No more</div>';
  },
  //可选,用户自定义列表加载提示信息
  listLoading:'<div>Loading...</div>',
  //可选,每页数据加载完成之后触发的函数
  loadDone:function(){
    //Do something
  }
});
```

###API
####reloadData
重新加载指定页面的数据
```html
<div id="list-container">
    ...
        <li class="list-item-11"></li>
    ...
</div>
```

```javascript
//自动重新加载屏幕中间位置页面的数据
_list.reloadData();
```

####clear
清空列表数据,并重新加载

```javascript
_list.clear();
```

