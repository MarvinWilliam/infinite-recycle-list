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
  listDom:'#list-container',
  //必须,数据加载函数
  dataLoader:function(pageindex,success_calbak,error_calbak){
    $.ajax({
      url:'...',
      type:'post',
      data:{
        ...
        pageindex:pageindex
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
  //可选,每页的大小
  pagesize:20,
  //可选,增量加载触发值
  threshold:200,
  //可选,向上滑动时,屏幕下方的数据是否销毁
  recycle:true,
  //可选,用户自定义列表没有更多显示的内容
  customNomore:function(){
    return '<div>No more</div>';
  },
  //可选,用户自定义列表加载提示信息
  listLoading:function(){
    return '<div>Loading...</div>';
  },
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
//重新加载list-item-11所在页面的数据
_list.reloadData($('.list-item-11'));
```

####clear
清空列表数据,并重新加载

```javascript
_list.clear();
```

