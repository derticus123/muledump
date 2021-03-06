(function($, window) {

    var VERSION = setuptools.version.major + '.' + setuptools.version.minor + '.' + setuptools.version.patch;
    window.VERSION = VERSION;
    setuptools.tmp.corsAttempts = 0;

// version check

    function cmpver(v1, v2) {
        v1 = v1.split('.'); v2 = v2.split('.');
        for (var i = 0; i < v1.length && i < v2.length; i++) {
            var r = (v1[i] || 0) - (v2[i] || 0);
            if (r) return r;
        }
        return v1.length - v2.length;
    }

//  check for updates and display a lightbox with the results
    function checkupdates(force) {

        //  if no updates are available then this
        function BaseMessage() {

            setuptools.lightbox.build('muledump-about', 'You are on the latest release.<br>');

        }

        //  build the final message data and display it
        function DisplayMessage() {

            setuptools.state.notifier = true;
            setuptools.lightbox.build('muledump-about', ' \
                <br><a href="' + setuptools.config.url + '/CHANGELOG" class="drawhelp docs nostyle" target="_blank">Changelog</a> | \
                <a href="' + setuptools.config.url + '/" target="_blank">Muledump Homepage</a> | \
                <a href="https://github.com/jakcodex/muledump" target="_blank">Github</a> \
                <br><br>Jakcodex Support Discord - <a href="https://discord.gg/JFS5fqW" target="_blank">https://discord.gg/JFS5fqW</a>\
                <br><br>Did you know Muledump can be loaded from Github now? \
                <br><br>Check out <a href="' + setuptools.config.url + '/muledump.html" target="_blank">Muledump Online</a> to see it in action. \
            ');
            if ( setuptools.state.loaded === true && setuptools.data.config.enabled === true ) setuptools.lightbox.build('muledump-about', ' \
                <br><br>Create and download a <a href="#" class="setuptools app backups noclose">backup</a> from here to get online fast. \
            ');

            setuptools.lightbox.override('backups-index', 'goback', function() { });
            setuptools.lightbox.settitle('muledump-about', '<strong>Muledump Local v' + VERSION + '</strong>');
            setuptools.lightbox.display('muledump-about', {variant: 'select center'});
            $('.setuptools.app.backups').click(setuptools.app.backups.index);
            $('.drawhelp.docs').click(function(e) {
                setuptools.lightbox.ajax(e, {title: 'About Muledump', url: $(this).attr('href')}, this);
            });

        }

        //  process the github tags api response
        function ProcessResponse(data) {

            if (data.meta.status !== 200) {

                if ( force === true ) {

                    BaseMessage();
                    DisplayMessage();

                }

                return;
            }

            if ( typeof setuptools.tmp.updatecheck === 'undefined' ) setuptools.tmp.updatecheck = {
                expires: Date.now()+setuptools.config.updatecheckTTL,
                data: data
            };

            //  head of renders check
            var currentRendersData = rendersVersion.match(setuptools.config.regex.renderscheck);
            var currentRenders = new Date(currentRendersData[1], currentRendersData[2]-1, currentRendersData[3], currentRendersData[4], currentRendersData[5], currentRendersData[6]);
            var latestRenders = new Date(currentRendersData[1], currentRendersData[2]-1, currentRendersData[3], currentRendersData[4], currentRendersData[5], currentRendersData[6]);
            var latestRendersName = currentRendersData[7];
            var latestRendersData;

            var d = data.data, topver = VERSION, url;
            for (var i = 0; i < d.length; i++) {

                //  version check
                if ( d[i].name.indexOf('renders-') === -1 && cmpver(d[i].name, topver) > 0) {
                    topver = d[i].name;
                    url = setuptools.config.githubArchive + topver + '.zip';
                }

                //  middle of renders check
                var rendersData = d[i].name.match(setuptools.config.regex.renderscheck);
                if ( typeof rendersData === 'object' && rendersData !== null ) {

                    var newTimestamp = new Date(rendersData[1], rendersData[2]-1, rendersData[3], rendersData[4], rendersData[5], rendersData[6]);
                    if ( newTimestamp > latestRenders ) {
                        latestRenders = newTimestamp;
                        latestRendersName = rendersData[7];
                        latestRendersData = d[i];
                    }

                }

            }

            //  tail of renders check
            if ( latestRenders > currentRenders ) setuptools.app.muledump.notices.add(
                'New renders update available for ' + latestRendersName,
                function(d, i, rendersData, currentRendersName, latestRendersName) {
                    var arg = $.extend(true, [], latestRendersData, rendersData, {currentRenders: currentRendersName, latestRenders: latestRendersName});
                    setuptools.app.assistants.rendersupdate(arg);
                },
                [d, i, rendersData, currentRendersData[7], latestRendersName]
            );

            //  display the lightbox if a url is provided
            window.techlog("Update found: " + url, 'hide');

            var notifiedver = setuptools.storage.read('updatecheck-notifier');
            if ( url ) setuptools.app.muledump.notices.add(
                'Muledump v' + topver + ' now available!',
                checkupdates,
                true
            );

            if ( url && ( force === true || (!force && options.updatecheck === true && (typeof notifiedver === 'undefined' || (typeof notifiedver === 'string' && cmpver(notifiedver, topver) > 0)))) ) {

                DoDisplayMessage = true;
                setuptools.lightbox.build('muledump-about', ' \
                    <div style="width: 100%; border: #ffffff solid 2px; padding: 10px; background-color: #111;">\
                        Jakcodex/Muledump v' + topver + ' is now available! \
                        <br><br><a download="muledump-' + topver + '.zip" href="' + url + '">' + url + '</a> \
                    </div>\
                ');

                setuptools.storage.write('updatecheck-notifier', topver);

            }

            if (force === true && !url) {

                DoDisplayMessage = true;
                BaseMessage();

            }

            if ( DoDisplayMessage === true ) DisplayMessage();

        }

        var DoDisplayMessage = false;

        //  send the request if there is no cached data or the cache has expired
        if (
            typeof setuptools.tmp.updatecheck === 'undefined' ||
            (
                typeof setuptools.tmp.updatecheck === 'object' &&
                Date.now() >= setuptools.tmp.updatecheck.expires
            )
        ) {

            //  delete any old cache data
            if ( typeof setuptools.tmp.updatecheck === 'object' ) delete setuptools.tmp.updatecheck;

            //  send the request
            var xhr = $.ajax({
                dataType: 'jsonp',
                url: setuptools.config.updatecheckURL
            });

            xhr.fail(function () {
                BaseMessage();
                DoDisplayMessage = true;
                if (DoDisplayMessage === true) DisplayMessage();
            });

            xhr.done(ProcessResponse);

        }
        //  fresh response data located, don't call the api again
        else ProcessResponse(setuptools.tmp.updatecheck.data);

    }

    var techlog = function(msg, type) {

        if ( !type ) type = "string";

        //  prepare debug settings
        if ( window.verbosity ) verbosity = window.verbosity;

        //  debug logging to console
        if ( (window.debugging === true && type === 'string') || type === 'force' ) console.log(msg);

        //  process tech report if enabled
        //  this is no longer enabled for the time being
        /*if ( type !== 'hide' && options.techreport === true ) {

            //  strip sensitive data from messages
            if ( typeof msg === 'object' ) msg = JSON.stringify(msg);
            msg = msg.replace(/<PaymentData>{"token": "(.*?)"/g, '<PaymentData>{"token": "***"');
            msg = msg.replace(/"PaymentData":"{\\"token\\": \\"(.*?)\\"/g, '"PaymentData":"{\\"token\\": \\"***\\"');
            msg = msg.replace(/"Name":".*?"/g, '{"Name":"***"}');
            msg = msg.replace(/<Name>.*?<\/Name>/g, "<Name>***</Name>");
            msg = msg.replace(/guid=(.*?)&(password|secret)=(.*?)&/g, '***hidden***&');
            msg = msg.replace(/(((steamworks|kongregate|kabam):[a-zA-Z0-9]*)|([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5}))/g, function(match) {
                return $.sha256(match);
            });

            //  make it html friendly
            msg = msg.replace(/</g, "&lt;");
            msg = msg.replace(/>/g, "&gt;");
            $("#techreport").append("<div>" + msg + "<br><br></div>\n");

        }*/
    };

    window.techlog = techlog;

    var mules = window.mules = {};

// document load

    var accounts;
    var Mule = window.Mule;

    $(function() {

        setuptools.init.main(window);

        $.ajaxSetup({
            cache: false,
            timeout: 5000
        });

        $('body').delegate('.item', 'click', window.toggle_filter);
        $('body').delegate('.guid', 'click', function(){ this.select(); });

        //  check for updates if auto check is enabled
        if ( setuptools.config.devForcePoint !== 'online-versioncheck' && setuptools.state.hosted === false ) {
            checkupdates();
        } else {
            setuptools.app.upgrade.version();
        }

        //  mulequeue menu
        $('#mulequeue')
            .click(setuptools.app.mulequeue.ui.manager)
            .mouseover(setuptools.app.mulequeue.menu);

        $('#options').prev().click(function() {
            var $o = $('#options');
            if ($o.attr('style')) $o.attr('style', ''); else $o.css('display', 'block');
        });

        $('#about').bind('click', function() {
            if ( setuptools.state.hosted === false ) {
                checkupdates(true);
            } else {

                setuptools.lightbox.build('muledump-checkupdates', ' \
                    You are on the latest version. \
                    <br><br><a href="' + setuptools.config.url + '/CHANGELOG" class="drawhelp docs nostyle" target="_blank">v' + VERSION + ' Changelog</a> | \
                    <a href="' + setuptools.config.url + '/" target="_blank">Muledump Homepage</a> | \
                    <a href="https://github.com/jakcodex/muledump" target="_blank">Github</a> \
                    <br><br>Muledump Online is updated automatically with new versions. \
                    <br><br>Jakcodex Support Discord - <a href="https://discord.gg/JFS5fqW" target="_blank">https://discord.gg/JFS5fqW</a> \
                ');

                setuptools.lightbox.settitle('muledump-checkupdates', '<strong>Muledump Online v' + VERSION + '</strong>');
                setuptools.lightbox.display('muledump-checkupdates', {variant: 'select'});

                $('.drawhelp.docs').click(function(e) {
                    setuptools.lightbox.ajax(e, {title: 'About Muledump', url: $(this).attr('href')}, this);
                });

            }
        });

        /*
        //  disabled for now
        $('#techtoggle').click(function() {
            if ( window.techreport === false ) {

                $(this).html('disable debugging');
                window.techreport = true;

            } else {

                $(this).html('enable debugging');
                window.techreport = false;
                $('#techreport').empty();

            }
        });
        */

        window.init_totals();

        //  display any generated notices
        setuptools.app.muledump.notices.monitor();

        //  initialize accounts
        setuptools.init.accounts();

        //  initialize AffaSearch(tm)
        setuptools.app.muledump.pagesearch.init();

        if (!window.nomasonry) {
            $('#stage').masonry({
                itemSelector : '.mule',
                columnWidth : 198,
                transitionDuration: 0,
                "isFitWidth": true
            });
        }

        relayout();
    });

    var mtimer;

    function relayout() {
        if (mtimer) return;
        mtimer = setTimeout(function() {
            window.update_totals();
            window.update_filter();
            if (!window.nomasonry) $('#stage').masonry('layout');
            mtimer = 0;
        }, 0);
    }

    window.relayout = relayout;


})($, window);
