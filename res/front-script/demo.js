depends('View')
.build(function(View) {
    var DemoView = inherit(View, function() {
        View.call(this, 'demo', {
            message: 'Hello world'
        });
    });

    $(function() {
        $('body').append(new DemoView().ui);
    });
});
