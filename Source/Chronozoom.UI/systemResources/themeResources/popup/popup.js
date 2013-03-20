rin.PopupControl.View = function (rootBase, width, height) {
    var $rootControl = $(rootBase);
    var $escontainer = $rootControl.find('.rin_popup_es_container');
    var $escontrols = $rootControl.find('.rin_popup_controls');
    var firstTimeLoad = true;
    var finalWidth = width || $rootControl.width();
    var finalHeight = height || $rootControl.height();
    this.esControl = null;

    $rootControl.offset({ top: finalHeight / 4, left: finalWidth / 4 });

    this.showES = function (esControl, interactionControls) {
        this.esControl = esControl;
        $escontainer.append(esControl);
        if (firstTimeLoad) {
            firstTimeLoad = false;
            $rootControl.animate({ 'width': finalWidth + 'px',
                'height': finalHeight + 'px',
                'left': '0px',
                'top': '0px',
                'opacity': '1'
            }, 500, 'easeOutQuint',
                                        function () {
                                            if (interactionControls) { $escontrols.append(interactionControls); }
                                            $escontrols.fadeIn(300);
                                        });
        }
        else {
            if (interactionControls) { $escontrols.append(interactionControls); }
            $escontainer.fadeIn(100);
        }
    }

    this.hideES = function (callback, callbackContext) {
        callbackContext = callbackContext || this;
        $escontainer.fadeOut(500, function () {
            $escontainer.empty();
            $escontrols.children().detach();
            if (callback)
                callback.call(callbackContext);
        });
    }

    this.close = function (callback, callbackContext) {
        callbackContext = callbackContext || this;
        $rootControl.animate(
          {
              'opacity': '0'
          }, 400, 'easeOutCirc', function () {
              if (callback)
                  callback.call(callbackContext);
          });
    }
};
