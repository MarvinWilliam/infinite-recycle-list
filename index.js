(function () {
    var _list = new InfiniteList({
        listId: 'list-container',
        dataLoader: function (pageindex, pagesize, success_calbak, error_calbak) {
            setTimeout(function () {
                var result = [],
                    index  = 0;
                for (; index < pagesize; index++) {
                    result[index] = {
                        index: (pageindex - 1) * pagesize + index,
                        date: new Date().getTime()
                    };
                }
                success_calbak(result);
            }, 300);
        },
        htmlRender: function (datalist) {
            var result = '';
            datalist.forEach(function (item, index) {
                result += '<li>' + item.index + '&nbsp;&nbsp;&nbsp;' + item.date + '</li>';
            });
            return result;
        },
        pageSize: 10,
        recycle: true,
        pageCache: true
    });

    $('#reload').on('click', function (event) {
        event.stopImmediatePropagation();
        _list.reloadData();
    });
    
    $('#clear').on('click', function (event) {
        event.stopImmediatePropagation();
        _list.clear();
    });

    $('#list-container').on('click', 'li', function () {
        window.location.href = '/infinite-recycle-list/detail.html';
    });
})();
