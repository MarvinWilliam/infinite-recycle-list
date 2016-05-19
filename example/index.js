(function() {
    var _list = new InfiniteList({
        listDom: '#list-container',
        dataLoader: function(pageindex, success_calbak, error_calbak) {
            setTimeout(function() {
                var result = [],
                    index = 0;
                for (; index < 20; index++) {
                    result[index] = {
                        index: pageindex * 100 + index,
                        date: new Date().getTime()
                    };
                }
                success_calbak(result);
            }, 300);
        },
        htmlRender: function(datalist) {
            var result = '';
            datalist.forEach(function(item, index) {
                result += '<li>' + item.index + '&nbsp;&nbsp;&nbsp;' + item.date + '</li>';
            });
            return result;
        },
        pageSize: 20,
        recycle: true
    });

    $('#clear').on('click', function(event) {
        event.stopImmediatePropagation();
        _list.clear();
    });

    $('#list-container').on('click', 'li', function() {
        _list.reloadData($(this));
    });
})();
