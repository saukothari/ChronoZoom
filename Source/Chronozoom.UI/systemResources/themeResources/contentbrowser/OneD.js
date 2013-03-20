//This is the Metro OneD Template for the Content Browser. 
//This files deals with all the UI related functionalities, like animations
rin.ContentBrowserES.MetroOneD =
function (rootBase) {
    var $rootControl = $(rootBase);
    var $loader = $rootControl.find('.rin_metrooned_loading');
    var $btn_next = $rootControl.find('.rin_metrooned_next');
    var $btn_prev = $rootControl.find('.rin_metrooned_prev');
    var $scroll_next = $rootControl.find('.rin_metrooned_scroll_next');
    var $scroll_prev = $rootControl.find('.rin_metrooned_scroll_prev');
    var $metrooned_thumbScroller = $rootControl.find('.rin_metrooned_thumbScroller');
    var $thumbScrollerContainer = $rootControl.find('.rin_metrooned_thumbScroller .rin_metrooned_container');
    var $thumbnailContent = $metrooned_thumbScroller.find('.rin_metrooned_content');
    var $imageError = $rootControl.find('.rin_metrooned_error');
    var $cue = $rootControl.find('.rin_metrooned_cue');
    var totalContent = 0, sliderLeft = 0, padding = 0;
    var sliderWidth = $rootControl.width();
    var $currentPreview = null;

    //--Call this once on load, to show up the first image
    if ($thumbnailContent.length > 0) {
        var self = onthumbclick;
        setTimeout(function () {
            onload();
            $('.rin_metrooned_itemsList').each(function () {
                totalContent += $(this).width();
            });

            if (totalContent <= 150)
                totalContent = $thumbnailContent.length * 125;

            $('.rin_metrooned_groupsList').each(function () {
                totalContent += parseInt($(this).css('marginRight').replace("px", ""));
                totalContent += parseInt($(this).css('marginLeft').replace("px", ""));
            });
            totalContent += parseInt($thumbScrollerContainer.css('paddingRight').replace("px", ""));
            totalContent += parseInt($thumbScrollerContainer.css('paddingLeft').replace("px", ""));
            $thumbScrollerContainer.css('width', totalContent);

            showHideScrolls();
            enableScrolls(0);
            showNav();

            self.call($thumbnailContent[0]);

            var context = ko.contextFor($rootControl[0]).$root;

            updatePrevNextStyles(context);

        }, 500);
    }

    //If there is a preview change request, either from ES keyframes or user click
    function onPreviewChange(newValue) {
        var context = ko.contextFor($rootControl[0]).$root;
        if (context.itemUpdateTrigger !== rin.ContentBrowserES.changeTrigger.none) {
            var selectedThumb = $thumbnailContent.find("img[alt$=" + "'" + newValue.id + "'" + "]");

            if (selectedThumb && selectedThumb.length > 0)
                selectedThumb = selectedThumb.parent().get(0);

            switch (context.itemUpdateTrigger) {
                case rin.ContentBrowserES.changeTrigger.onclick:
                case rin.ContentBrowserES.changeTrigger.onkeyframeapplied:
                    onthumbclick.call(selectedThumb);
                    break;
                case rin.ContentBrowserES.changeTrigger.onnext:
                    showNext.call($rootControl[0]);
                    break;
                case rin.ContentBrowserES.changeTrigger.onprevious:
                    showPrev.call($rootControl[0]);
                    break;
            }

            context.itemUpdateTrigger = rin.ContentBrowserES.changeTrigger.none;
        }
    }

    function showHideScrolls() {
        if (totalContent > getSliderWidth()) {
            $scroll_next.show();
            $scroll_prev.show();
        }
        else {
            $scroll_next.hide();
            $scroll_prev.hide();
        }
    }

    //For impatient users, who click on thumbnails without waiting for the previews to load completely.
    //Remove the older previews, before you load the new ones.
    function removeOldPreviews(count) {
        if (isNaN(count))
            count = 1;
        var previewCount = $('.rin_metrooned_preview').length;
        if (previewCount > count) {
            $('.rin_metrooned_preview').each(function (index, value) {
                if (index != (count - 1)) {
                    $(value).stop();
                    $(value).detach();
                }
            });
        }
    }
        
    function isPreviewChanging() {
        removeOldPreviews();
    }

    function onthumbclick(e) {
        var context = ko.dataFor(this);
        var $content = $(this);
        var $elem = $content.find('img');

        var $currImage = $rootControl.children('img:first');
        $cue.hide();
        $loader.show();

        if ($currentPreview != null)
            $currentPreview.empty();

        $currentPreview = $('<img class="rin_metrooned_preview"/>');
        $currentPreview.load(function () {
            var $newimg = $(this);
            $newimg.insertAfter($imageError);
            $loader.hide();

            //now we have two large images on the page
            //fadeOut the old one so that the new one gets shown
            if ($currImage) {
                $currImage.stop().fadeOut(400, function () {
                    $(this).detach();
                    $cue.fadeIn(100);
                });
            }

        }).attr('src', context.largeMedia)
          .error(function () {
              $imageError.fadeIn(50);
              $loader.hide();
              if ($currImage)
                  $currImage.fadeOut(200);
              $cue.fadeOut(100);
          });

        updatePrevNextStyles(ko.contextFor(this).$root);

        if (e) { e.preventDefault(); }
    }

    function hideNav() {
        $btn_next.stop().animate({ 'right': '-50px' }, 500);
        $btn_prev.stop().animate({ 'left': '-50px' }, 500);
    }

    function showNav() {
        $btn_next.stop().animate({ 'right': '0px' }, 500);
        $btn_prev.stop().animate({ 'left': '0px' }, 500);
    }

    $rootControl.rinTouchGestures(function (e, touchGestures) {
        if (touchGestures.gesture == 'swipe') {
            if (touchGestures.direction == 'left') {
                goToNext.call(this);
            }
            else if (touchGestures.direction == 'right') {
                goToPrevious.call(this);
            }
        }
    });

    $rootControl.keyup(function (e) {
        var key = e.which || e.keyCode || e.keyChar;
        if (key == 37) {
            goToPrevious.call(this);
        }
        else if (key == 39) {
            goToNext.call(this);
        }
    });

    function goToNext() {
        var context = ko.contextFor(this).$root;
        if (context !== undefined && !context.isLastItem()) {
            context.onNext();
        }
    }

    function goToPrevious() {
        var context = ko.contextFor(this).$root;
        if (context !== undefined && !context.isFirstItem()) {
            context.onPrevious();
        }
    }

    //the aim is to load the new image,
    //place it before the old one and fadeOut the old one
    //we use the current variable to keep track which
    //image comes next / before
    function showNext() {
        var context = ko.contextFor(this).$root;
        updatePrevNextStyles(context);
        loadPreviewImage(context.currentItem().largeMedia, "right");
    }

    function showPrev() {
        var context = ko.contextFor(this).$root;
        updatePrevNextStyles(context);
        loadPreviewImage(context.currentItem().largeMedia, "left");
    }

    function loadPreviewImage(largeMedia, animationName) {
        isPreviewChanging();
        var width = $rootControl.outerWidth();
        $cue.hide();
        $loader.show();

        var $currentPreview = $('<img class="rin_metrooned_preview"/>');

        $currentPreview
        .load(function () {
            var $currImage = $rootControl.children('img:first');
            var $newimg = $(this);
            isPreviewChanging();
            $newimg.insertAfter($imageError);
            $loader.hide();
            $imageError.hide();

            $newimg.animate({ left: 0 }, 500, 'easeOutCirc');

            if ($currImage) {
                switch (animationName) {
                    case "left":
                        $currImage.animate({ marginLeft: width }, 500, 'easeOutCirc', function () {
                            $(this).detach();
                            $cue.fadeIn(300);
                        });
                        break;
                    case "right":
                    default:
                        $currImage.animate({ left: -width }, 500, 'easeOutCirc', function () {
                            $(this).detach();
                            $cue.fadeIn(300);
                        });
                        break;
                }
            }
        }).attr('src', largeMedia)
        .css('left', animationName === 'left' ? -width : width)
        .error(function (e) {
            $imageError.fadeIn(50);
            $loader.hide();
            if (typeof ($currImage) !== undefined)
                $currImage.fadeOut(200);
            $cue.hide();
        });
    }

    function updatePrevNextStyles(context) {
        if (context == undefined)
            return;

        var current = context.currentItem();
        var previous = context.previousItem;

        if (current === undefined || previous === undefined || current.id === undefined)
            return;

        var $e_next = $($thumbnailContent.find("img[alt$=" + "'" + current.id + "'" + "]"));
        var $e_previous = $($thumbnailContent.find("img[alt$=" + "'" + previous.id + "'" + "]"));

        if ($e_next != undefined) {
            $e_next.fadeTo(200, 1);
            var currentLeft = $thumbScrollerContainer.offset().left;
            var thumboffset = $e_next.offset().left;
            if (thumboffset < 0) {
                currentLeft = currentLeft - (thumboffset * 1.75);
                if (currentLeft > 0) currentLeft = 0;
                $thumbScrollerContainer.stop().animate({ left: currentLeft }, 400, 'easeOutCirc'); //with easing
                enableScrolls(Math.abs(currentLeft));
            }

            if ((thumboffset + $e_next.width()) > getSliderWidth()) {
                currentLeft += getSliderWidth() - (thumboffset + ($e_next.width() * 1.5));
                $thumbScrollerContainer.stop().animate({ left: currentLeft }, 400, 'easeOutCirc', function () {
                    var offsetLeft = Math.abs($thumbScrollerContainer.offset().left);
                    enableScrolls(offsetLeft);
                }); //with easing                
            }
        }

        if ($e_previous != undefined && previous != -1) {
            $e_previous.fadeTo(200, 0.9);
        }
    }

    $scroll_prev.rinTouchGestures(function (e, touchGesture) {
        if (touchGesture.gesture == 'simpletap') {
            scrollLeft(e);
        }
    }, { simpleTap: true, swipe: false });

    $scroll_next.rinTouchGestures(function (e, touchGesture) {
        if (touchGesture.gesture == 'simpletap') {
            scrollRight(e);
        }
    }, { simpleTap: true, swipe: false });

    function scrollLeft(e) {
        var currentLeft = Math.abs($thumbScrollerContainer.offset().left);
        if ((currentLeft - getSliderWidth()) < 0) {
            currentLeft = 0;
        }
        else {
            currentLeft -= getSliderWidth();
        }

        $thumbScrollerContainer.stop().animate({ left: -currentLeft }, 400, 'easeOutCirc'); //with easing
        enableScrolls(currentLeft);

        if (e) { e.preventDefault(); }
    }

    function scrollRight(e) {
        var currentLeft = Math.abs($thumbScrollerContainer.offset().left);
        if ((currentLeft + getSliderWidth()) < totalContent) {
            currentLeft += getSliderWidth();
            $thumbScrollerContainer.stop().animate({ left: -currentLeft }, 400, 'easeOutCirc'); //with easing
        }
        enableScrolls(currentLeft);
        if (e) { e.preventDefault(); }
    }

    function enableScrolls(currentLeft) {
        $scroll_prev.removeClass('disabled');
        $scroll_next.removeClass('disabled');

        if ((currentLeft) <= 0) {
            $scroll_prev.addClass('disabled');
        }
        else if ((currentLeft + getSliderWidth()) > totalContent) {
            $scroll_next.addClass('disabled');
        }
    }

    function getSliderWidth() {
        var rootWidth = $rootControl.width();
        if (rootWidth <= 0) {
            if ($rootControl.parent().width() > 100)
                rootWidth = $rootControl.parent().width();
            else
                rootWidth = $(window).width();
        }
        sliderWidth = rootWidth - padding;
        return sliderWidth;
    }

    function onload() {
        sliderLeft = $thumbScrollerContainer.position().left;
        padding = ($rootControl.find('.rin_metrooned_outer_container').css('paddingRight').replace("px", "")) * 2;
        sliderWidth = getSliderWidth();
        $metrooned_thumbScroller.css('width', sliderWidth);
        $('.rin_metrooned_CBDescription').css('height', $thumbnailContent.offset().top - 20);

        var fadeSpeed = 200;
        $rootControl.find('.rin_metrooned_thumbScroller .rin_metrooned_thumb').hover(
        				function () { //mouse over
        				    $(this).addClass('hover');
        				    $(this).fadeTo(fadeSpeed, 1);
        				},
        				function () { //mouse out
        				    $(this).removeClass('hover');
        				    $(this).fadeTo(fadeSpeed, 0.9);
        				}
        			);

        var context = ko.contextFor($rootControl[0]).$root;
        context.currentItem.subscribe(onPreviewChange);
    }

    $(window).resize(function () {
        $thumbScrollerContainer.stop().animate({ left: sliderLeft }, 400, 'easeOutCirc'); //with easing
        $metrooned_thumbScroller.css('width', $rootControl.width() - padding);
        $('.rin_metrooned_CBDescription').css('height', $thumbnailContent.offset().top - 20);
        getSliderWidth();
        showHideScrolls();
    });
};
