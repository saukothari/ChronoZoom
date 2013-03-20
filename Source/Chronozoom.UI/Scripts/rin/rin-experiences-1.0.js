// rin-experiences-1.0.js built Wed 03/13/2013 at  4:46:05.47 
﻿/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="../core/Common.js"/>
/// <reference path="../core/ESItem.js"/>
/// <reference path="../core/EventLogger.js"/>
/// <reference path="../core/Orchestrator.js"/>
/// <reference path="../core/PlayerConfiguration.js"/>
/// <reference path="../core/PlayerControl.js"/>
/// <reference path="../core/ResourcesResolver.js"/>
/// <reference path="../core/RinDataProxy.js"/>
/// <reference path="../core/ScreenPlayInterpreter.js"/>
/// <reference path="../core/StageAreaManager.js"/>
/// <reference path="../core/TaskTimer.js"/>
/// <reference path="../player/ControllerViewModel.js"/>
/// <reference path="../../../web/js/jquery-1.7.2-dev.js" />
/// <reference path="../../../web/js/knockout-2.1.0.debug.js">

window.rin = window.rin || {};

rin.internal.ui = rin.internal.ui || {};

rin.internal.ui.DefaultController = function (viewModel) {
    var self = this,
        playerControllerElement = null,
        playerControllerElementHtml = null,
        stageControl = null,
        interactionControlsWrap = null,
        playPauseControl,
        volumeControl,
        timelineControl,
        fullScreenControl,
        troubleShooterControl,
        createChildControls = function () {
            var playPauseUIControl = $(".rin_PlayPauseContainer", playerControllerElement),
		        volumeUIControl = $(".rin_VolumeControl", playerControllerElement),
		        timelineUIControl = $(".rin_TimelineHolder", playerControllerElement),
		        fullScreenUIControl = $(".rin_FullScreenControl", playerControllerElement),
		        troubleShooterUIControl = $(".rin_TroubleShooterControlHolder", playerControllerElement);

            playPauseControl = new rin.internal.ui.PlayPauseControl(playPauseUIControl, viewModel.playPauseVM);
            volumeControl = new rin.internal.ui.VolumeControl(volumeUIControl, viewModel.volumeVM);
            timelineControl = new rin.internal.ui.SeekerControl(timelineUIControl, viewModel.seekerVM);
            fullScreenControl = new rin.internal.ui.FullScreenControl(fullScreenUIControl, self.getUIControl());
            troubleShooterControl = new rin.internal.ui.TroubleShootingControl(troubleShooterUIControl, playerControllerElement, interactionControlsWrap, viewModel.troubleShooterVM);

            volumeControl.volumeChangedEvent.subscribe(function (value) {
                self.volumeChangedEvent.publish(value);
            });
            timelineControl.seekTimeChangedEvent.subscribe(function (value) {
                self.seekTimeChangedEvent.publish(value);
            });
        },
        hookEvents = function () {
            var CONST_CONTROL_TIMER_MS = 5000,
                controlTimerId,
                resetControlTimer = function (timerId, onTimeOut) {
                    timerId && clearTimeout(timerId);
                    timerId = setTimeout(onTimeOut, CONST_CONTROL_TIMER_MS);
                    return timerId;
                };

            /*Custom Events Start*/
            playerControllerElement.bind("showControls", function (type, event) {
                self.showControlsEvent.publish();
                controlTimerId = resetControlTimer(controlTimerId, function () {
                    self.hideControlsEvent.publish();
                    volumeControl && volumeControl.volumeSlider.hideSlider();
                });
                event.preventDefault();
                event.stopPropagation();
            });

            playerControllerElement.bind("showHideTroubleShootingControls", function (type, event) {
                self.showHideTroubleShootingControls.publish();
            });

            /*Custom Events End*/
            playerControllerElement.mousemove(function (event) {
                playerControllerElement.trigger("showControls", event);
            });
            playerControllerElement.mouseover(function (event) {
                playerControllerElement.trigger("showControls", event);
            });
        };

    //******************************Exposed as Public Members Start ********************************/
    this.showControlsEvent = new rin.contracts.Event();
    this.hideControlsEvent = new rin.contracts.Event();
    this.volumeChangedEvent = new rin.contracts.Event();
    this.seekTimeChangedEvent = new rin.contracts.Event();
    this.showHideTroubleShootingControls = new rin.contracts.Event();

    this.isSystemES = true;
    this.initStageArea = function (stageElement, playerRoot) {
        ko.renderTemplate("Controller.tmpl", viewModel, null, playerRoot);
        playerControllerElement = $(".mainContainer", playerRoot);
        stageControl = $(".rin_ExperienceStream", playerControllerElement);
        stageControl.append(stageElement);

        // Disable event propogation
        var cancelTouch = function (e) {
            e.stopPropagation();
            e.cancelBubble = true;
        }
        // Disable touch events so that on IE 10 RT the browser will not switch to the next tab on a horizontal swipe.
        stageElement.addEventListener("MSPointerDown MSPointerMove MSPointerUp", cancelTouch, false);

        interactionControlsWrap = $(".rin_InteractiveContainer", playerControllerElement);
        createChildControls();
        hookEvents();
    };

    this.setInteractionControls = function (controls) {
        interactionControlsWrap.children().detach();
        controls && interactionControlsWrap && interactionControlsWrap.append(controls);
    };

    this.getUIControl = function () {
        playerControllerElementHtml = playerControllerElementHtml || playerControllerElement[0];
        return playerControllerElementHtml;
    };
    this.setVM = function (viewModel) {
        ko.bindingHandlers.stopBinding = {
            init: function () {
                return { controlsDescendantBindings: true };
            }
        };
        ko.virtualElements.allowedBindings.stopBinding = true;
        ko.applyBindings(viewModel, this.getUIControl());
        playPauseControl.setVM(viewModel.playPauseVM);
        volumeControl.setVM(viewModel.volumeVM);
        timelineControl.setVM(viewModel.seekerVM);        
        troubleShooterControl.setVM(viewModel.troubleShooterVM);
    };
    //******************************Exposed as Public Members End ********************************/
};

rin.internal.ui.SliderBase = function (controlPlaceHolder, controlElement, isVertical, viewModel) {

    if (isVertical) {
        ko.renderTemplate('VerticalSliderControl.tmpl', viewModel, null, controlPlaceHolder.get(0));
    }
    else {
        ko.renderTemplate('HorizontalSliderControl.tmpl', viewModel, null, controlPlaceHolder.get(0));
    }

    var CONST_CONTROL_TIMER_MS = 500,
        thumbSelected = false,
        self = this,
        controlTimerId,
        resetControlTimer = function (timerId, onTimeOut) {
            timerId && clearTimeout(timerId);
            timerId = setTimeout(onTimeOut, CONST_CONTROL_TIMER_MS);
            return timerId;
        };

    this.sliderContainer = $(".rin_SliderContainer", controlPlaceHolder);
    this.slider = $(".rin_Slider", controlPlaceHolder);

    this.valueChangedEvent = new rin.contracts.Event();

    /* Custom Events*/
    this.showSlider = function (type, event) {
        self.sliderContainer.show();
    };

    this.hideSlider = function (type, event) {
        self.sliderContainer.hide();
    };

    this.sliderContainer.bind("changeValue", function (type, event) {
        var sliderOffset = self.sliderContainer.offset(),
            sender = event.currentTarget,
            valueInPercent;
        if (isVertical) {
            valueInPercent = 100 - ((event.pageY - sliderOffset.top) * 100 / sender.clientHeight);
        }
        else {
            valueInPercent = (event.pageX - sliderOffset.left) * 100 / sender.clientWidth;
        }
        self.valueChangedEvent.publish(valueInPercent);
        event.preventDefault();
        event.stopPropagation();
    });
    /* Custom Events*/

    controlPlaceHolder.mouseover(function (event) {
        controlTimerId && clearTimeout(controlTimerId);
        self.showSlider();
    });

    this.sliderContainer.mousemove(function (event) {
        if (thumbSelected) {
            self.sliderContainer.trigger("changeValue", event);
        }
        event.preventDefault();
    });

    this.sliderContainer.mouseup(function (event) {
        if (thumbSelected) {
            self.sliderContainer.trigger("changeValue", event);
            thumbSelected = false;
        }
    });

    this.sliderContainer.mousedown(function (event) {
        thumbSelected = true;
        self.sliderContainer.trigger("changeValue", event);
    });

    this.sliderContainer.mouseleave(function (event) {
        thumbSelected = false;
    });

    if (controlElement) {
        //If a controlling element is passed, then the slider is to be shown only on its hover
        //like a volume control
        controlElement.mouseover(function (event) {
            controlTimerId && clearTimeout(controlTimerId);
            self.showSlider();
        });

        controlPlaceHolder.mouseleave(function (event) {
            controlTimerId = resetControlTimer(controlTimerId, function () {
                self.hideSlider();
            });
        });

        controlElement.mouseleave(function (event) {
            controlTimerId = resetControlTimer(controlTimerId, function () {
                self.hideSlider();
            });
        });
        this.hideSlider();
    }
};

rin.internal.ui.VerticalSlider = function (controlPlaceHolder, controlElement, viewModel) {
    return new rin.internal.ui.SliderBase(controlPlaceHolder, controlElement, true, viewModel);
};

rin.internal.ui.HorizontalSlider = function (controlPlaceHolder, controlElement, viewModel) {
    return new rin.internal.ui.SliderBase(controlPlaceHolder, controlElement, false, viewModel);
};

rin.internal.ui.PlayPauseControl = function (control, viewModel) {
    ko.renderTemplate('PlayPauseControl.tmpl', viewModel, null, control.get(0));
    this.setVM = function (viewModel) {
        ko.applyBindings(viewModel, control.get(0));
    }
};

rin.internal.ui.VolumeControl = function (control, viewModel) {
    ko.renderTemplate('VolumeControl.tmpl', viewModel, null, control.get(0));

    var volumeControlSlider = $(".rin_VolumeSliderPlaceHolder", control),
        volumeButton = $(".rin_Button", control),
        self = this;

    this.volumeSlider = new rin.internal.ui.VerticalSlider(volumeControlSlider, volumeButton, viewModel);
    this.volumeChangedEvent = rin.contracts.Event();
    this.volumeSlider.valueChangedEvent.subscribe(function (value) {
        self.volumeChangedEvent.publish(value);
    });
    this.setVM = function (viewModel) {
        ko.applyBindings(viewModel, control.get(0));
    };
};

rin.internal.ui.SeekerControl = function (control, viewModel) {
    var self = this;
    this.timelineSlider = new rin.internal.ui.HorizontalSlider(control, null, viewModel);
    this.seekTimeChangedEvent = rin.contracts.Event();
    this.timelineSlider.valueChangedEvent.subscribe(function (value) {
        self.seekTimeChangedEvent.publish(value);
    });
    this.setVM = function (viewModel) {
        ko.applyBindings(viewModel, control.get(0));
    };
};

rin.internal.ui.FullScreenControl = function (controlRoot, htmlElement) {
    ko.renderTemplate('FullScreenControl.tmpl', null, null, controlRoot.get(0));
    
    var playerResizeEvent = document.createEvent('HTMLEvents');
    playerResizeEvent.initEvent('resize', false, false);
    playerResizeEvent.data = {};

    var self = this,
        button = $(".rin_Button", controlRoot),
        control = $(htmlElement),
        isFullScreen = false,
        inFullScreenMode = function () {
            if (htmlElement.requestFullScreen)
                return document.fullscreenElement;
            if (htmlElement.mozRequestFullScreen)
                return document.mozFullScreen;
            if (htmlElement.webkitRequestFullScreen)
                return document.webkitIsFullScreen;
            return isFullScreen;
        },
        toggleFullScreen = function () {
            if (inFullScreenMode()) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                }
                else {
                    htmlElement.removeEventListener('keydown', escListener, false);
                    document.removeEventListener('keydown', escListener, false);
                    isFullScreen = false;
                }
            }
            else {
                if (htmlElement.requestFullScreen) {
                    htmlElement.requestFullScreen();
                } else if (htmlElement.mozRequestFullScreen) {
                    htmlElement.mozRequestFullScreen();
                } else if (htmlElement.webkitRequestFullScreen) {
                    htmlElement.webkitRequestFullScreen();
                }
                else {
                    htmlElement.addEventListener('keydown', escListener, false);
                    document.addEventListener('keydown', escListener, false);
                    isFullScreen = true;
                }
            }
            toggleFullScreenResources();

            htmlElement.dispatchEvent(playerResizeEvent);
        },
        escListener = function (e) {
            if (e && e.keyCode && e.keyCode === 27) { toggleFullScreen(); }
        },
        toggleFullScreenResources = function (event) {
            if (inFullScreenMode()) {
                button.removeClass('rin_RestoreScreen');
                button.addClass('rin_FullScreen');
                control.addClass('rin_FullScreenContent');
            }
            else {
                button.addClass('rin_RestoreScreen');
                button.removeClass('rin_FullScreen');
                control.removeClass('rin_FullScreenContent');
            }
        };

    document.addEventListener('fullscreenchange', toggleFullScreenResources, false);
    document.addEventListener('mozfullscreenchange', toggleFullScreenResources, false);
    document.addEventListener('webkitfullscreenchange', toggleFullScreenResources, false);

    button.click(function (event) {
        toggleFullScreen();
    });
};

rin.internal.ui.TroubleShootingControl = function (controlRoot, controlParent, interactionControlsWrap, viewModel) {
    ko.renderTemplate('TroubleShooter.tmpl', viewModel, null, controlRoot.get(0));
    controlParent.keydown(function (event) {
        if (
            ((event.key && event.key.toLowerCase() === "t") ||
             (event.keyCode && (event.keyCode === 84 || event.keyCode === 116)))
            && event.shiftKey) {
            controlParent.trigger("showHideTroubleShootingControls", event);
        }
    });
    viewModel.interactionEvent.subscribe(function () {
        var elements = $(":visible", interactionControlsWrap), elementsList, index, opCode;
        if (elements && elements.length) {
            elementsList = new rin.internal.List();
            for (index = 0; index < elements.length; index++) {
                elementsList.push($(elements[index]));
            }
            elementsList = elementsList.filter(function (item) {
                return item.data("events");
            });
            if (elementsList && elementsList.length) {
                opCode = rin.util.randInt(0, elementsList.length - 1);
                elementsList[opCode].trigger('click');
            }
        }
    });

    this.setVM = function (viewModel) {
        ko.applyBindings(viewModel, control);
    };
};
﻿/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../../../web/js/knockout-2.1.0.debug.js">
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="../core/Common.js">
/// <reference path="../core/Orchestrator.js">
/// <reference path="../utilities/SelfTest.js">

window.rin = window.rin || {};

rin.internal.PlayerControllerViewModel = function (orchestrator) {
    var showControls = ko.observable(false),
        isPlayerReady = ko.observable(false),
        isHeaderVisible = ko.observable(true),
        isPlayPauseVisible = ko.observable(true),
        isInteractiveControlVisible = ko.observable(true),
        isRightContainerVisible = ko.observable(true),
        areShareButtonsVisible = ko.observable(false),
        isVolumeVisible = ko.observable(true),
        isSeekerVisible = ko.observable(true),
        isFullScreenControlVisible = ko.observable(true),
        areTroubleShootControlsVisible = ko.observable(false),
        interactionControls = ko.observable(null),
        title = ko.observable(""),
        branding = ko.observable(""),
        description = ko.observable(""),
        seekerViewModel = new rin.internal.SeekerControllerViewModel(orchestrator),
        playPauseViewModel = new rin.internal.PlayPauseControllerViewModel(orchestrator),
        volumeControlViewModel = new rin.internal.VolumeControllerViewModel(orchestrator),
        troubleShooterViewModel = new rin.internal.TroubleShooterViewModel(orchestrator),
        removeInteractionControls = function () {
            interactionControls(null);
        },
        setInteractionControls = function (currentInteractingES) {
            if (typeof currentInteractingES.getInteractionControls === 'function') {
                interactionControls(currentInteractingES.getInteractionControls());
            }
        },
        onPlayerReadyChanged = function (value) {
            if (true === value || false === value) {
                isPlayerReady(value);
            } else {
                rin.internal.debug.assert(false, "Boolean expected. Recieved: " + value.toString());
            }
        },
        onPlayerStateChanged = function (playerStateChangedEventArgs) {
            switch (playerStateChangedEventArgs.currentState) {
                case rin.contracts.playerState.playing:
                    removeInteractionControls();
                    break;
            }
        },
        onPlayerESEvent = function (eventArgs) {
            switch (eventArgs.eventId) {
                case rin.contracts.esEventIds.interactionActivatedEventId:
                    orchestrator.pause();
                    setInteractionControls(eventArgs.sender);
                    break;
            }
        },
        onSeekChanged = function () {
            removeInteractionControls();
        },
        toggleControls = function () {
            if (orchestrator.playerConfiguration.playerMode === rin.contracts.playerMode.AuthorerPreview && !orchestrator.playerConfiguration.isFromRinPreviewer) {
                isPlayPauseVisible(false);
                areShareButtonsVisible(false);
                isFullScreenControlVisible(false);
                isSeekerVisible(false);
                areShareButtonsVisible(false);
            }
            else if (orchestrator.playerConfiguration.playerMode === rin.contracts.playerMode.AuthorerEditor) {
                isPlayPauseVisible(false);
                isRightContainerVisible(false);
                isHeaderVisible(false);
                isSeekerVisible(false);
            }
        },
        changeTroubleShootControlsVisibilty = function () {
            if (areTroubleShootControlsVisible()) {
                areTroubleShootControlsVisible(false);
            }
            else {
                areTroubleShootControlsVisible(true);
            }
        },
        initialize = function () {
            seekerViewModel.initialize();
            playPauseViewModel.initialize();
            volumeControlViewModel.initialize();
            troubleShooterViewModel.initialize();
            title(orchestrator.getNarrativeInfo().title || "");
            branding(orchestrator.getNarrativeInfo().branding || "");
            description(orchestrator.getNarrativeInfo().description || "");
            toggleControls();
        };

    orchestrator.isPlayerReadyChangedEvent.subscribe(onPlayerReadyChanged, null, this);
    orchestrator.playerESEvent.subscribe(onPlayerESEvent, null, this);
    orchestrator.playerStateChangedEvent.subscribe(onPlayerStateChanged, null, this);

    seekerViewModel.seekChangedEvent.subscribe(onSeekChanged, null, this);

    return {
        initialize: initialize,

        volumeVM: volumeControlViewModel,
        seekerVM: seekerViewModel,
        playPauseVM: playPauseViewModel,
        troubleShooterVM: troubleShooterViewModel,

        showControls: showControls,
        isHeaderVisible: isHeaderVisible,
        isPlayPauseVisible: isPlayPauseVisible,
        isInteractiveControlVisible: isInteractiveControlVisible,
        isRightContainerVisible: isRightContainerVisible,
        isVolumeVisible: isVolumeVisible,
        isSeekerVisible: isSeekerVisible,
        areShareButtonsVisible: areShareButtonsVisible,
        isFullScreenControlVisible: isFullScreenControlVisible,
        areTroubleShootControlsVisible: areTroubleShootControlsVisible,
        changeTroubleShootControlsVisibilty: changeTroubleShootControlsVisibilty,

        isPlayerReady: isPlayerReady,
        interactionControls: interactionControls,
        title: title,
        branding: branding,
        description: description,
        onPlayerESEvent: onPlayerESEvent
    };
};

rin.internal.VolumeControllerViewModel = function (orchestrator) {
    var isMuted = ko.observable(false),
        effectivePlayerVolumeLevelPercent = ko.observable("0%"),
        resetPlayerVolumeLevelPercent = function () {
            var effectiveVolume = 0;
            if (!isMuted()) {
                effectiveVolume = Math.round(orchestrator.getPlayerVolumeLevel() * 100);
            }
            effectivePlayerVolumeLevelPercent(effectiveVolume + "%");
        },
        setVolumeInPercent = function (value) {
            var actualValue = value / 100;
            orchestrator.setPlayerVolumeLevel(actualValue);
            isMuted(false);
            resetPlayerVolumeLevelPercent();
        },
        setMute = function (value) {
            orchestrator.setIsMuted(value);
            isMuted(value);
            resetPlayerVolumeLevelPercent();
        },
        changeMuteState = function () {
            var newValue = !isMuted();
            setMute(newValue);
            return false;
        },
        initialize = function () {        
        };

    isMuted(orchestrator.getIsMuted());
    resetPlayerVolumeLevelPercent();

    return {
        initialize: initialize,
        getValue: effectivePlayerVolumeLevelPercent,
        getVolumeLevelPercent: effectivePlayerVolumeLevelPercent,
        isMuted: isMuted,
        setVolumeInPercent: setVolumeInPercent,
        setMute: setMute,
        changeMuteState: changeMuteState
    };
};

rin.internal.SeekerControllerViewModel = function (orchestrator) {
    var CONST_SEEKER_UPDATE_FREQ_MS = 500,
        seekTimer = null,
        seekPosition = 0,
        isSeekEnabled = true,
        narrativeDuration = 0,
        seekPositionPercent = ko.observable("0%"),
        seekChangedEvent = new rin.contracts.Event(),
        onChangeSeekerPosition = function (value, fromSetter) {
            fromSetter = fromSetter || false;
            if (isSeekEnabled && seekPosition !== value) {
                seekPosition = value;
                seekPositionPercent(Math.round(seekPosition * 100) / 100 + "%");
                if (fromSetter) {
                    /*removeInteractionControls();*/
                    seekChangedEvent.publish(value);
                    var seekToDuration = value * narrativeDuration / 100,
                        playerState = orchestrator.getPlayerState();
                    if (playerState === rin.contracts.playerState.playing) {
                        orchestrator.play(seekToDuration);
                    }
                    else {
                        orchestrator.pause(seekToDuration);
                    }
                }
            }
        },
        setSeekPositionPercent = function (value) {
            if (value !== seekPosition) {
                onChangeSeekerPosition(value, true);
            }
        },
        updateSeekPosition = function () {
            var currentOffset = orchestrator.getCurrentLogicalTimeOffset(),
                newSeekPosition = narrativeDuration < 0 ? 0 : (currentOffset * 100 / narrativeDuration);
            onChangeSeekerPosition(newSeekPosition, false);
        },
        startSeekPositionUpdater = function () {
            seekTimer = setInterval(updateSeekPosition, CONST_SEEKER_UPDATE_FREQ_MS);
        },
        stopSeekPositionUpdater = function () {
            clearInterval(seekTimer);
        },
        initialize = function () {
            narrativeDuration = orchestrator.getNarrativeInfo().totalDuration;
            setSeekPositionPercent("0%");
        };
    return {
        initialize: initialize,
        isSeekEnabled: isSeekEnabled,
        seekChangedEvent: seekChangedEvent,
        getValue: seekPositionPercent,
        getSeekPositionPercent: seekPositionPercent,
        setSeekPositionPercent: setSeekPositionPercent,
        startSeekPositionUpdater: startSeekPositionUpdater,
        stopSeekPositionUpdater: stopSeekPositionUpdater
    };
};

rin.internal.PlayPauseControllerViewModel = function (orchestrator) {
    this.isPlaying = ko.observable();
    this.playPauseEvent = function () {
        var playerState = orchestrator.getPlayerState();
        switch (playerState) {
            case rin.contracts.playerState.stopped:
            case rin.contracts.playerState.pausedForBuffering:
            case rin.contracts.playerState.pausedForExplore:
                orchestrator.play();
                break;

            case rin.contracts.playerState.playing:
                orchestrator.pause();
                break;

            default:
                rin.internal.debug.assert(false, "onPlayPause: Unrecognized player state = " + playerState);
                break;
        }
    };
    this.initialize = function () {
    };
};

rin.internal.MediaPlayPauseControllerViewModel = function (mediaElement) {
    this.isPlaying = ko.observable(false);
    var self = this;
    this.playPauseEvent = function () {
        var playerState = mediaElement.paused;
        if (playerState) {
            mediaElement.play();
        }
        else {
            mediaElement.pause();
        }
    };
    this.onMediaPlayPause = function () {
        self.isPlaying(!mediaElement.paused);
    };
    this.initialize = function () {
        mediaElement.addEventListener('play', this.onMediaPlayPause, false);
        mediaElement.addEventListener('pause', this.onMediaPlayPause, false);
    };
};

rin.internal.MediaSeekerControllerViewModel = function (mediaElement, experienceStream) {
    var CONST_SEEKER_UPDATE_FREQ_MS = 500,
        seekTimer = null,
        seekPosition = 0,
        isSeekEnabled = true,
        seekPositionPercent = ko.observable("0%"),
        seekChangedEvent = new rin.contracts.Event(),
        onChangeSeekerPosition = function (value, fromSetter) {
            fromSetter = fromSetter || false;
            if (isSeekEnabled && seekPosition !== value) {
                seekPosition = value;
                seekPositionPercent(Math.round(seekPosition * 100)/100 + "%");
                if (fromSetter) {
                    /*removeInteractionControls();*/
                    seekChangedEvent.publish(value);
                    var seekToDuration = value * mediaElement.duration / 100,
                        playerState = mediaElement.paused;
                    if (!playerState) {
                        experienceStream.play(seekToDuration);
                    }
                    else {
                        experienceStream.pause(seekToDuration);
                    }
                }
            }
        },
        setSeekPositionPercent = function (value) {
            if (value !== seekPosition) {
                onChangeSeekerPosition(value, true);
            }
        },
        updateSeekPosition = function () {
            var currentOffset = mediaElement.currentTime,
                newSeekPosition = mediaElement.duration < 0 ? 0 : (currentOffset * 100 / mediaElement.duration);
            onChangeSeekerPosition(newSeekPosition, false);
        },
        startSeekPositionUpdater = function () {
            seekTimer = setInterval(updateSeekPosition, CONST_SEEKER_UPDATE_FREQ_MS);
        },
        stopSeekPositionUpdater = function () {
            clearInterval(seekTimer);
        },
        initialize = function () {
            setSeekPositionPercent("0%");
        };
    return {
        initialize: initialize,
        isSeekEnabled: isSeekEnabled,
        seekChangedEvent: seekChangedEvent,
        getValue: seekPositionPercent,
        getSeekPositionPercent: seekPositionPercent,
        setSeekPositionPercent: setSeekPositionPercent,
        startSeekPositionUpdater: startSeekPositionUpdater,
        stopSeekPositionUpdater: stopSeekPositionUpdater
    };
};

rin.internal.TroubleShooterViewModel = function (orchestrator) {
    var CONST_SEEKER_UPDATE_FREQ_MS = 500,
        self = this,
        minimumTimeInterval = ko.observable(),
        maximumTimeInterval = ko.observable(),
        selfTester = new rin.internal.SelfTester(orchestrator),
        seekTimer,
        updateSeekPosition = function () {
            var currentOffset = orchestrator.getCurrentLogicalTimeOffset();
            self.currentTime(orchestrator.getCurrentLogicalTimeOffset());
        };

    this.interactionEvent = new rin.contracts.Event();
    this.showControls = ko.observable(true);
    this.showEditNarrativeDialog = ko.observable(false);
    this.narrativeInfo = ko.observable(orchestrator._rinData);
    this.showSelfTestDialog = ko.observable(false);
    this.timeMin = ko.computed({
        read: function () {
            return minimumTimeInterval();
        },
        write: function (value) {
            if (!isNaN(value)) {
                minimumTimeInterval(value);
                selfTester.minimumTimeInterval = value;
            }
        }
    });
    this.timeMax = ko.computed({
        read: function () {
            return maximumTimeInterval();
        },
        write: function (value) {
            if (!isNaN(value)) {
                maximumTimeInterval(value);
                selfTester.maximumTimeInterval = value;
            }
        }
    });
    this.editNarrativeClick = function () {
        this.showSelfTestDialog(false);
        this.showEditNarrativeDialog(true);
    };
    this.editCompleteClick = function () {
        orchestrator.load({ data: JSON.parse(this.narrativeInfo()) });
        this.showEditNarrativeDialog(false);
    };
    this.editCancelClick = function () {
        this.narrativeInfo = ko.observable(JSON.stringify(orchestrator._rinData, null, "\t"));
        this.showEditNarrativeDialog(false);
    };
    this.startSelfTestClick = function () {
        selfTester.startSelfTest();
        this.showSelfTestDialog(false);
    };
    this.showSelfTestDialogClick = function () {
        this.showEditNarrativeDialog(false);
        this.showSelfTestDialog(true);
    };
    this.stopSelfTestClick = function () {
        selfTester.stopSelfTest();
        this.showSelfTestDialog(false);
    };
    this.initialize = function () {
        this.showControls = ko.observable(true);
        this.showEditNarrativeDialog = ko.observable(false);
        this.narrativeInfo = ko.observable(JSON.stringify(orchestrator._rinData.data, null, "\t"));
        this.showSelfTestDialog = ko.observable(false);
        this.currentTime(orchestrator.getCurrentLogicalTimeOffset());
        this.totalDuration(orchestrator && orchestrator.getNarrativeInfo() && orchestrator.getNarrativeInfo().totalDuration || 10);
    };
    this.currentTime = ko.observable(0);
    this.totalDuration = ko.observable(0);
    this.timeControl = ko.computed({
        read: function () {
            return Math.round(self.currentTime() * 100) / 100 + "/" + Math.round(self.totalDuration() * 100) / 100;
        }
    });
    this.startSeekPositionUpdater = function () {
        seekTimer = setInterval(updateSeekPosition, CONST_SEEKER_UPDATE_FREQ_MS);
    };
    this.stopSeekPositionUpdater = function () {
        if(seekTimer)
            clearInterval(seekTimer);
    };
    selfTester.interactionEvent.subscribe(function () {
        self.interactionEvent.publish();
    });
};
﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../../../web/js/jquery-1.7.2-dev.js" />
/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../../../web/js/seadragon-0.8.9.js" />
/// <reference path="../core/TaskTimer.js" />
/// <reference path="../../../web/js/knockout-2.1.0.debug.js" />

window.rin = window.rin || {};

(function (rin) {
    // ES for displaying deepzoom images.
    var DeepZoomES = function (orchestrator, esData) {
        var self = this;
        
        this._orchestrator = orchestrator;
        this._userInterfaceControl = rin.util.createElementWithHtml(DeepZoomES.elementHtml).firstChild; // Experience stream UI DOM element.
        this._seadragonClip = this._userInterfaceControl.getElementsByClassName("seadragonClip")[0];
        this._seadragonContainer = this._userInterfaceControl.getElementsByClassName("seadragonContainer")[0];
        this._seadragonElement = null;
        this._esData = esData;
        this._url = orchestrator.getResourceResolver().resolveResource(esData.resourceReferences[0].resourceId, esData.experienceId); // Resolved url to the DZ image.
        this.viewportChangedEvent = new rin.contracts.Event();

        // Monitor interactions on the ES
        $(this._userInterfaceControl).bind("mousedown mousewheel", function (e) {
            self._orchestrator.onESEvent(rin.contracts.esEventIds.interactionActivatedEventId, null);
            self._userInterfaceControl.focus();
        });

        // Handle key events for panning
        this._userInterfaceControl.addEventListener('keydown', function (e) {
            if (e.keyCode == '37') //left arrow
                self.panLeftCommand();
            else if (e.keyCode == '38') //up arrow
                self.panUpCommand();
            else if (e.keyCode == '39') //right arrow
                self.panRightCommand();
            else if (e.keyCode == '40') //down arrow 
                self.panDownCommand();
        }, true);

        // For testing EA, as its under active dev, dont remove these comments.
        //var host = new rin.embeddedArtifacts.ArtifactHost(this._userInterfaceControl, this._orchestrator);
        //var ea1 = new rin.embeddedArtifacts.HotSpot();
        //host.addArtifact(ea1);
    };

    rin.util.extend(rin.contracts.DiscreteKeyframeESBase, DeepZoomES);

    DeepZoomES.prototypeOverrides = {
        // Load and initialize the ES.
        load: function (experienceStreamId) {
            var self = this;
            DeepZoomES.parentPrototype.load.call(self, experienceStreamId);

            self.setState(rin.contracts.experienceStreamState.buffering); // Set to buffering till the ES is loaded.
            rin.internal.debug.write("Load called for " + self._url);

            self._keyframes.sort(function (a, b) { a.offset, b.offset });
            
            self._viewer = new Seadragon.Viewer(self._seadragonContainer);
            self._viewer.clearControls();

            // Raise state transition event anytime the state of the ES has changed, like a pan or zoom.
            self._viewer.addEventListener('animationfinish', function () {
                var playerState = self._orchestrator.getPlayerState();
                if (playerState == rin.contracts.playerState.pausedForExplore || playerState == rin.contracts.playerState.stopped) {
                    self._orchestrator.onESEvent(rin.contracts.esEventIds.stateTransitionEventId, { isUserInitiated: true, transitionState: "completed" });
                }
            });

            self._orchestrator.getPlayerRootControl().addEventListener("resize", function () {
                self._updateViewportClip(self._viewer);
            }, true);

            /// Regex for matching zoom.it urls
            var zoomItMatch = self._url.match(new RegExp("http://(www\\.)?zoom\\.it/(\\w+)\\s*"));

            // Default animation time used for panning and zooming.
            Seadragon.Config.animationTime = .5;

            // Function to open the dzi if source is not a zoom.it url.
            function openDzi(dzi) {
                self._viewer.addEventListener('open', function (openedViewer) {
                    self._viewer.addEventListener('animation', function (viewer) { self.raiseViewportUpdate(); });
                    self._viewer.addEventListener('animationstart', function (viewer) { self.raiseViewportUpdate(); });
                    self._viewer.addEventListener('animationfinish', function (viewer) { self.raiseViewportUpdate(); });
                    self._seadragonElement = self._seadragonContainer.firstChild;
                    self.setState(rin.contracts.experienceStreamState.ready);
                    self.initTouch();
                    self.raiseViewportUpdate();
                });

                self._viewer.addEventListener('error', function (openedViewer) {
                    rin.internal.debug.write("Deepzoom ES got into error state.");
                    self.setState(rin.contracts.experienceStreamState.error);
                });

                self._viewer.openDzi(dzi);
            }

            // Function to open a zoom.it url.
            function onZoomitresponseonse(response) {
                if (response.status != 200) {
                    // e.g. the URL is malformed or the service is down
                    rin.internal.debug.write(response.statusText);
                    self._orchestrator.eventLogger.logErrorEvent("Error in loading deepzoom {0}. Error: {1}", self._url, response.statusText);
                    self.setState(rin.contracts.experienceStreamState.error);
                    return;
                }

                var content = response.content;

                if (content && content.ready) { // Image is ready!!
                    openDzi(content.dzi);
                } else if (content.failed) { // zoom.it couldnt process the image
                    rin.internal.debug.write(content.url + " failed to convert.");
                    self._orchestrator.eventLogger.logErrorEvent("Error in loading deepzoom {0}. Error: {1}", self._url, "failed to convert");
                    self.setState(rin.contracts.experienceStreamState.error);
                } else { // image is still under processing
                    rin.internal.debug.write(content.url + " is " + Math.round(100 * content.progress) + "% done.");
                    self.setState(rin.contracts.experienceStreamState.error);
                }
            }

            if (zoomItMatch) {
                // Using JSONP approach to to load a zoom.it url.
                var imageID = zoomItMatch[2];

                $.ajax({
                    url: "http://api.zoom.it/v1/content/" + imageID,
                    dataType: "jsonp",
                    success: onZoomitresponseonse
                });
            }
            else {
                openDzi(this._url);
            }
        },

        // Pause the player.
        pause: function (offset, experienceStreamId) {
            DeepZoomES.parentPrototype.pause.call(this, offset, experienceStreamId);
            if (this._activeViewportAnimationStoryboard !== null) {
                this._activeViewportAnimationStoryboard.stop();
                this._activeViewportAnimationStoryboard = null;
            }
        },

        // Apply a keyframe to the ES.
        displayKeyframe: function (keyframeData, nextKeyframeData, interpolationOffset) {
            if (this.getState() != rin.contracts.experienceStreamState.ready) return; // Not ready yet, do not attempt to show anything.

            // If there is no keyframe after this one, just load the state of the last keyframe.
            if (!nextKeyframeData) {
                this._animateToKeyframeAsync(keyframeData, 0);
                return;
            }

            // If there are keyframes after this, interpolate the keyframe to the current offset and then animate to target keyframe.
            var keyframeDuration = nextKeyframeData.offset - keyframeData.offset;
            var currentKeyframe = keyframeData;
            if (typeof interpolationOffset == "number" && interpolationOffset > 0) {
                var animation = new rin.internal.DoubleAnimation(keyframeDuration, this._rectFromKeyframe(keyframeData), this._rectFromKeyframe(nextKeyframeData));
                var rect = animation.getValueAt(interpolationOffset);
                var currentSeadragonRect = new Seadragon.Rect(rect.x, rect.y, rect.width, rect.height);
                var self = this;
                self._viewer.viewport.fitBounds(currentSeadragonRect, true);
                keyframeDuration -= interpolationOffset;
            }
            else {
                this._animateToKeyframeAsync(currentKeyframe, 0);
            }

            if (this.isLastActionPlay) {
                this._animateToKeyframeAsync(nextKeyframeData, keyframeDuration);
            }
        },

        raiseViewportUpdate: function(){
            this._updateViewportClip(this._viewer);
        },

        _updateViewportClip: function (viewer) {
            var topLeft = viewer.viewport.pixelFromPoint(new Seadragon.Point(0, 0), true);
            var bottomRight = viewer.viewport.pixelFromPoint(new Seadragon.Point(1, viewer.source.height / viewer.source.width), true);
            var panelW = this._userInterfaceControl.clientWidth;
            var panelH = this._userInterfaceControl.clientHeight;

            this._seadragonContainer.style.width = panelW + "px";
            this._seadragonContainer.style.height = panelH + "px";

            var newLeft = topLeft.x;
            var newTop = topLeft.y;

            if (newLeft > 0) {
                this._seadragonClip.style.left = newLeft + "px";
                this._seadragonContainer.style.left = -newLeft + "px";
            }
            else {
                this._seadragonClip.style.left = "0px";
                this._seadragonContainer.style.left = "0px";
                newLeft = 0;
            }
            if (newTop > 0) {
                this._seadragonClip.style.top = newTop + "px";
                this._seadragonContainer.style.top = -newTop + "px";
            }
            else {
                this._seadragonClip.style.top = "0px";
                this._seadragonContainer.style.top = "0px";
                newTop = 0;
            }

            this._seadragonClip.style.width = Math.min(panelW, (bottomRight.x - newLeft)) + "px";
            this._seadragonClip.style.height = Math.min(panelH, (bottomRight.y - newTop)) + "px";

            this.viewportChangedEvent.publish({ "x": topLeft.x, "y": topLeft.y, "width": bottomRight.x - topLeft.x, "height": bottomRight.y - topLeft.y });
        },

        // Handle touch input for zoom and pan.
        touchHandler: function (event) {
            var touches = event.changedTouches,
             first = touches[0],
             type = "";
            switch (event.type) {
                case "touchstart": type = "mousedown"; break;
                case "touchmove": type = "mousemove"; break;
                case "touchend": type = "mouseup"; this.lastFirst = this.lastSecond = null; break;
                default: return;
            }

            var simulatedEvent = document.createEvent("MouseEvent");
            simulatedEvent.initMouseEvent(type, true, true, window, 1,
            first.screenX, first.screenY,
            first.clientX, first.clientY, false,
            false, false, false, 0, null);

            first.target.dispatchEvent(simulatedEvent);
            event.preventDefault();
            return false;
        },

        // Initialize touch gestures.
        initTouch: function () {
            var self = this,
                startRect,
                msGesture,
                node = self._viewer.drawer.elmt;

            // If running on IE 10/RT, enable multitouch support.
            if (window.navigator.msPointerEnabled) {
                Seadragon.Utils.addEvent(node, "MSPointerDown", function (e) {
                    self._orchestrator.onESEvent(rin.contracts.esEventIds.interactionActivatedEventId, null);
                    self._userInterfaceControl.focus();

                    if (!msGesture) {
                        msGesture = new MSGesture();
                        msGesture.target = node;
                    }

                    msGesture.addPointer(e.pointerId);
                    e.stopPropagation();
                    e.preventDefault();
                });

                Seadragon.Utils.addEvent(node, "MSGestureChange", function (e) {
                    if (startRect) {
                        if (e.scale > .25) {
                            startRect = self._viewer.viewport.getBounds(false);
                            var newWidth = startRect.width / (e.scale);
                            var newHeight = startRect.height / (e.scale);

                            var newX = startRect.x - (newWidth - startRect.width) / 2;
                            var newY = startRect.y - (newHeight - startRect.height) / 2;

                            var pointsDelta = self._viewer.viewport.deltaPointsFromPixels(new Seadragon.Point(e.translationX, e.translationY), true);

                            newX -= pointsDelta.x;
                            newY -= pointsDelta.y;

                            var rect = new Seadragon.Rect(newX, newY, newWidth, newHeight);
                            startRect = rect;
                            self._viewer.viewport.fitBounds(rect);
                            e.stopPropagation();
                        }
                    }
                });

                Seadragon.Utils.addEvent(node, "MSGestureEnd", function (e) {
                    startRect = null; msGesture.stop();
                });

                Seadragon.Utils.addEvent(node, "MSGestureStart", function (e) {
                    startRect = self._viewer.viewport.getBounds(true);
                    e.stopPropagation();
                });
            }
            else { // Not IE 10, use normal single touch handlers.
                var handler = function (event) { return self.touchHandler(event); };
                self._userInterfaceControl.addEventListener("touchstart", handler, true);
                self._userInterfaceControl.addEventListener("touchmove", handler, true);
                self._userInterfaceControl.addEventListener("touchend", handler, true);
                self._userInterfaceControl.addEventListener("touchcancel", handler, true);
            }
        },

        // Get an instance of the interaction controls for this ES.
        getInteractionControls: function () {
            var self = this;
            if (!self.interactionControls) { // Check for a cached version. If not found, create one.
                self.interactionControls = document.createElement("div");

                this._orchestrator.getInteractionControls([rin.contracts.interactionControlNames.panZoomControl],
                    function (wrappedInteractionControls) {
                        // Populate the container div with the actual controls.
                        rin.util.assignAsInnerHTMLUnsafe(self.interactionControls, wrappedInteractionControls.innerHTML);
                        // Bind the controls with its view-model.
                        ko.applyBindings(self, self.interactionControls);
                    });
            }

            // Return the cached version or the container div, it will be populated once the interaction control is ready.
            return this.interactionControls;
        },

        // Zoom in to the image by a predefined amount.
        zoomInCommand: function () {
            this._viewer.viewport.zoomBy(1.2, null, false);
        },
        // Zoom out from the image by a predefined amount.
        zoomOutCommand: function () {
            this._viewer.viewport.zoomBy(.8, null, false);
        },
        // Pan the image by a predefined amount.
        panLeftCommand: function () {
            this._viewer.viewport.panBy(new Seadragon.Point(-this.panDistance / this._viewer.viewport.getZoom(true), 0), false);
        },
        // Pan the image by a predefined amount.
        panRightCommand: function () {
            this._viewer.viewport.panBy(new Seadragon.Point(this.panDistance / this._viewer.viewport.getZoom(true), 0), false);
        },
        // Pan the image by a predefined amount.
        panUpCommand: function () {
            this._viewer.viewport.panBy(new Seadragon.Point(0, -this.panDistance / this._viewer.viewport.getZoom(true)), false);
        },
        // Pan the image by a predefined amount.
        panDownCommand: function () {
            this._viewer.viewport.panBy(new Seadragon.Point(0, this.panDistance / this._viewer.viewport.getZoom(true)), false);
        },

        // Get a keyframe of the current state.
        captureKeyframe: function () {
            if (!this._viewer || !this._viewer.viewport) return "";
            var rect = this._viewer.viewport.getBounds();
            var keyframe = DeepZoomES.keyframeFormat.rinFormat(rect.x, rect.y, rect.width, rect.height);
            return keyframe;
        },

        // Convert a keyframe to a rect object for use with animations.
        _rectFromKeyframe: function (keyframeData) {
            var data = new rin.internal.XElement(keyframeData.data["default"]);
            return data ? new Seadragon.Rect(parseFloat(data.attributeValue("Viewport_X")), parseFloat(data.attributeValue("Viewport_Y")),
                        parseFloat(data.attributeValue("Viewport_Width")), parseFloat(data.attributeValue("Viewport_Height"))) : null;
        },

        _animateToKeyframeAsync: function (keyframeData, animationTime) {
            var self = this;
            setTimeout(function () { self._animateToKeyframe(keyframeData, animationTime) }, 1);
        },

        _animateToKeyframe: function (keyframeData, animationTime) {
            var rect = this._rectFromKeyframe(keyframeData);
            this._animateToViewport(rect, animationTime);
        },

        // Animate the ES to the given viewport.
        _animateToViewport: function (targetRect, animationTime) {
            var self = this;

            if (!targetRect) return;

            // If animation time is 0, just set the viewport to the target rect.
            if (animationTime == 0) {
                this._viewer.viewport.fitBounds(targetRect, true);
                return;
            }

            if (this._viewer && this._viewer.viewport) {
                var currentViewPort = this._viewer.viewport.getBounds();

                var viewportAnimation = new rin.internal.DoubleAnimation(animationTime,
                    { x: currentViewPort.x, y: currentViewPort.y, width: currentViewPort.width, height: currentViewPort.height },
                    { x: targetRect.x, y: targetRect.y, width: targetRect.width, height: targetRect.height });

                var viewportStoryboard = new rin.internal.Storyboard(viewportAnimation,
                    function (value) {
                        var rect = new Seadragon.Rect(value.x, value.y, value.width, value.height);
                        self._viewer.viewport.fitBounds(rect, true);
                    },
                    function () {
                        self._activeViewportAnimationStoryboard = null; // Nullify the storyboard as its complete.
                    });

                // Stop any existing animations.
                if (this._activeViewportAnimationStoryboard !== null) {
                    this._activeViewportAnimationStoryboard.stop();
                    this._activeViewportAnimationStoryboard = null;
                }

                viewportStoryboard.begin();
                this._activeViewportAnimationStoryboard = viewportStoryboard;
            }
        },

        _activeViewportAnimationStoryboard: null,
        _viewer: null,
        panDistance: .2,
        interactionControls: null,
    };

    rin.util.overrideProperties(DeepZoomES.prototypeOverrides, DeepZoomES.prototype);
    DeepZoomES.keyframeFormat = "<ZoomableMediaKeyframe Media_Type='SingleDeepZoomImage' Viewport_X='{0}' Viewport_Y='{1}' Viewport_Width='{2}' Viewport_Height='{3}'/>";
    DeepZoomES.elementHtml = "<div style='height:100%;width:100%;position:absolute;background:transparent;pointer-events:none;' tabindex='0'><div class='seadragonClip' style='height:100%;width:100%;position:absolute;background:transparent;left:0px;top:0px;overflow:hidden;pointer-events:auto;' tabindex='0'><div class='seadragonContainer' style='height:333px;width:600px;position:absolute;' tabindex='0'></div></div></div>";
    rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.DeepZoomExperienceStream", function (orchestrator, esData) { return new DeepZoomES(orchestrator, esData); });
    rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.ZoomableMediaExperienceStream", function (orchestrator, esData) { return new DeepZoomES(orchestrator, esData); });
})(rin);﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../core/TaskTimer.js" />

window.rin = window.rin || {};

(function (rin) {
    // ES for playing video clips.
    var VideoES = function (orchestrator, esData) {
        var self = this;
        this._orchestrator = orchestrator;
        this._userInterfaceControl = rin.util.createElementWithHtml(VideoES.elementHTML).firstChild;
        this._video = this._userInterfaceControl;
        this._esData = esData;

        this._url = orchestrator.getResourceResolver().resolveResource(esData.resourceReferences[0].resourceId, esData.experienceId);

        // Handle any interaction on the video and pause the player.
        $(this._userInterfaceControl).bind("mousedown", function (e) {
            self._orchestrator.onESEvent(rin.contracts.esEventIds.interactionActivatedEventId, null);
        });
    };

    rin.util.extend(rin.contracts.DiscreteKeyframeESBase, VideoES);

    VideoES.prototypeOverrides = {
        // Load and initialize the video.
        load: function (experienceStreamId) {
            if (!this._url)
                throw new Error("Video source not found!");

            var self = this;

            // Load any video trim data.
            if (self._esData.data.markers) {
                self._startMarker = self._esData.data.markers.beginAt;
            }

            // Set to buffering till the load is complete.
            this.setState(rin.contracts.experienceStreamState.buffering);
            rin.internal.debug.write("Load called for " + this._url);

            // Handle any errors while loading the video.
            this._video.onerror = function (error) {
                var errorString = "Video failed to load. Error: " + (self._video.error ? self._video.error.code : error) + "<br/>Url: " + self._url;
                var esInfo = self._orchestrator.debugOnlyGetESItemInfo();
                if (esInfo) {
                    errorString += "<br/>ES Info: {0}:{1} <br/>Lifetime {2}-{3}".rinFormat(esInfo.providerName, esInfo.id,
                    esInfo.beginOffset, esInfo.endOffset);
                }
                self._orchestrator.eventLogger.logErrorEvent(errorString);
                self.setState(rin.contracts.experienceStreamState.error);
            };

            // Handle load complete of the video.
            this._video.oncanplay = function () {
                rin.internal.debug.write("oncanplay called from " + self._url);
                if (self._desiredVideoPositon >= 0 && Math.abs(self._video.currentTime * 1000 - self._desiredVideoPositon) > 10) {
                    self._seek(self._desiredVideoPositon);
                }
            };

            // Handle ready state change and change the ES state accordingly.
            this._video.onreadystatechange = function (args) {
                var state = self._video.state();
            };

            // Constantly check for the state of the video to mointor buffering start and stop.
            this.readyStateCheck = function () {
                var state = self.getState();

                if (state == rin.contracts.experienceStreamState.ready || state == rin.contracts.experienceStreamState.error) return;

                if (self._video.readyState === self.CONST_READY_STATE) {
                    if (state !== rin.contracts.experienceStreamState.ready)
                        self.setState(rin.contracts.experienceStreamState.ready);
                }
                else {
                    if (state !== rin.contracts.experienceStreamState.buffering)
                        self.setState(rin.contracts.experienceStreamState.buffering);
                    setTimeout(self.readyStateCheck, 500);
                }
            }

            // set video source
            var baseUrl = (this._url.substr(0, this._url.lastIndexOf('.')) || this._url) + ".";
            for (var i = 0; i < this._supportedFormats.length; i++) {
                var srcElement = document.createElement("source");
                srcElement.setAttribute("type", this._supportedFormats[i].type);
                srcElement.setAttribute("src", baseUrl + this._supportedFormats[i].ext);
                this._video.appendChild(srcElement);
            }

            this.readyStateCheck();
        },
        // Unload the video.
        unload: function () {
            if (this.seekerViewModel && typeof (this.seekerViewModel.stopSeekPositionUpdater) === "function")
                this.seekerViewModel.stopSeekPositionUpdater();
        },
        // Play the video.
        play: function (offset, experienceStreamId) {
            try {
                var epsilon = .05; // Ignore minute seeks.
                if (Math.abs(this._video.currentTime - (this._startMarker + offset)) > epsilon) {
                    this._seek(offset, experienceStreamId);
                }
                this._video.play();
            } catch (e) { rin.internal.debug.assert(false, "exception at video element " + e.Message) }
        },
        // Pause the video.
        pause: function (offset, experienceStreamId) {
            try {
                var epsilon = .05; // Ignore minute seeks.
                if (Math.abs(this._video.currentTime - (this._startMarker + offset)) > epsilon) {
                    this._seek(offset, experienceStreamId);
                }
                this._video.pause();
            } catch (e) { rin.internal.debug.assert(false, "exception at video element " + e.Message) }
        },
        // Set the base volume of the video. This will be multiplied with the keyframed volume to get the final volume.
        setVolume: function (baseVolume) {
            this.baseVolume = baseVolume;

            if (this._video && typeof this._video.volume !== 'undefined') {
                this._video.volume = baseVolume;
            }
        },
        // Mute or unmute the video.
        setIsMuted: function (value) {
            if (this._video && typeof this._video.muted !== 'undefined') {
                this._video.muted = value;
            }
        },

        // Get interaction controls to use in popup mode.
        getInteractionControlsForPopup: function () {
            var self = this;
            if (!self._interactionControls) {
                self._interactionControls = document.createElement("div");

                self._orchestrator.getInteractionControls([rin.contracts.interactionControlNames.mediaControl],
                    function (wrappedInteractionControls) {
                        rin.util.assignAsInnerHTMLUnsafe(self._interactionControls, wrappedInteractionControls.innerHTML);

                        var playPauseUIControl = $(".rin_PlayPauseContainer", self._interactionControls);
                        var volumeUIControl = $(".rin_VolumeControl", self._interactionControls);
                        var timelineUIControl = $(".rin_TimelineHolder", self._interactionControls);

                        var seekerViewModel = new rin.internal.MediaSeekerControllerViewModel(self._video, self),
                            playPauseViewModel = new rin.internal.MediaPlayPauseControllerViewModel(self._video),
                            volumeControlViewModel = new rin.internal.VolumeControllerViewModel(self._orchestrator),
                            playPauseControl = new rin.internal.ui.PlayPauseControl(playPauseUIControl, playPauseViewModel),
                            volumeControl = new rin.internal.ui.VolumeControl(volumeUIControl, volumeControlViewModel),
                            timelineControl = new rin.internal.ui.SeekerControl(timelineUIControl, seekerViewModel);

                        seekerViewModel.initialize();
                        playPauseViewModel.initialize();
                        volumeControlViewModel.initialize();

                        //playPauseControl.setVM(playPauseViewModel);
                        volumeControl.setVM(volumeControlViewModel);
                        timelineControl.setVM(seekerViewModel);

                        seekerViewModel.startSeekPositionUpdater();
                        self.seekerViewModel = seekerViewModel;
                        volumeControl.volumeChangedEvent.subscribe(function (value) {
                            volumeControlViewModel.setVolumeInPercent(value);
                        });
                        timelineControl.seekTimeChangedEvent.subscribe(function (value) {
                            seekerViewModel.setSeekPositionPercent(value);
                        });
                    });
            }

            return self._interactionControls;
        },

        // Handle seeking of video.
        _seek: function (offset, experienceStreamId) {
            offset += this._startMarker;

            // See if the video element is ready.
            if (this._video.readyState == this.CONST_READY_STATE) {

                // In IE, video cannot seek before its initialTime. This property doesn't exist in Chrome.
                if (this._video.initialTime) {
                    offset = Math.max(offset, this._video.initialTime);
                }

                // See if we can seek to the specified offset.
                if (this._video.seekable) {
                    for (var i = 0; i < this._video.seekable.length; i++) {
                        if (this._video.seekable.start(i) <= offset && offset <= this._video.seekable.end(i)) {
                            this._video.currentTime = offset;
                            return;
                        }
                    }
                }

                // No, we have to reload, then seek.
                this.load(experienceStreamId);
            }
            else {
                this._desiredVideoPositon = offset;
            }
        },
        CONST_READY_STATE: 4,
        _desiredVideoPositon: -1, // Seek location in case the video is not buffered or loaded yet at the location.
        _url: null,
        _baseVolume: 1, // Volume from orchestrator.
        _startMarker: 0, // Start trim position for the video.
        _interactionControls: null,
        // List of formats supported by the ES. Browser will pick the first one which it supports.
        // All the below sources are added to the Video tag irrespective of the source file format.
        _supportedFormats : [
            { ext: "ogv", type: "video/ogg; codecs=\"theora, vorbis\"" },
            { ext: "webm", type: "video/webm" },
            { ext: "mp4", type: "video/mp4" }
        ]
    };

    VideoES.elementHTML = "<video style='height:100%;width:100%;position:absolute' preload='auto'>Sorry, Your browser does not support HTML5 video.</video>";
    rin.util.overrideProperties(VideoES.prototypeOverrides, VideoES.prototype);
    rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.VideoExperienceStream", function (orchestrator, esData) { return new VideoES(orchestrator, esData); });
})(rin);
﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../core/TaskTimer.js" />

window.rin = window.rin || {};

(function (rin) {
    // Code audio es to provide background as well as foreground audio.
    var AudioES = function (orchestrator, esData) {
        var self = this;
        this._orchestrator = orchestrator;

        this._userInterfaceControl = rin.util.createElementWithHtml(AudioES.elementHTML);
        this._audio = this._userInterfaceControl.firstChild;
        this._esData = esData;
        this._url = orchestrator.getResourceResolver().resolveResource(esData.resourceReferences[0].resourceId, esData.experienceId);
    };

    rin.util.extend(rin.contracts.DiscreteKeyframeESBase, AudioES);

    AudioES.prototypeOverrides = {
        // Load and initialize the ES.
        load: function (experienceStreamId) {
            var self = this;
            // Load audio markers to trim the audio
            if (self._esData.data.markers) {
                self._startMarker = self._esData.data.markers.beginAt;
            }

            // Call load on parent to init the keyframes.
            AudioES.parentPrototype.load.call(this, experienceStreamId);

            if (!this._url)
                throw new Error("Audio source not found!");

            var self = this;
            // Set to buffering till the audio is loaded.
            this.setState(rin.contracts.experienceStreamState.buffering);
            rin.internal.debug.write("Load called for " + this._url);

            // Handle any error while loading audio.
            this._audio.onerror = function (error) {

                var errorString = "Audio failed to load. Error: " + (self._audio.error ? self._audio.error.code : error) + "<br/>Url: " + self._url;
                var esInfo = self._orchestrator.debugOnlyGetESItemInfo();
                if (esInfo) {
                    errorString += "<br/>ES Info: {0}:{1} <br/>Lifetime {2}-{3}".rinFormat(esInfo.providerName, esInfo.id,
                    esInfo.beginOffset, esInfo.endOffset);
                }
                self._orchestrator.eventLogger.logErrorEvent(errorString);
                self.setState(rin.contracts.experienceStreamState.error);
            };

            // Handle load complete of audio.
            this._audio.oncanplay = function () {
                rin.internal.debug.write("oncanplay called from " + self._url);
                if (self._desiredAudioPositon >= 0 && Math.abs(self._audio.currentTime - self._desiredAudioPositon) > 0.01 /*epsilon*/) {
                    self._seekAudio(self._desiredAudioPositon);
                }
            };

            // Handle ready state change to get notified on buffering start and stop.
            this._audio.onreadystatechange = function (args) {
                var state = self._audio.state();
            };

            // Constantly check if the audio is ready and update the state as necessary.
            this.readyStateCheck = function () {
                var state = self.getState();
                if (state == rin.contracts.experienceStreamState.ready || state == rin.contracts.experienceStreamState.error) return;

                if (self._audio.readyState === self.CONST_READY_STATE) {
                    if (state !== rin.contracts.experienceStreamState.ready)
                        self.setState(rin.contracts.experienceStreamState.ready);
                }
                else {
                    if (state !== rin.contracts.experienceStreamState.buffering)
                        self.setState(rin.contracts.experienceStreamState.buffering);
                    setTimeout(self.readyStateCheck, 500);
                }
            }

            // Set audio sources with all supported formats
            var baseUrl = (this._url.substr(0, this._url.lastIndexOf('.')) || this._url) + ".";
            for (var i = 0; i < this._supportedFormats.length; i++) {
                var srcElement = document.createElement("source");
                srcElement.setAttribute("type", this._supportedFormats[i].type);
                srcElement.setAttribute("src", baseUrl + this._supportedFormats[i].ext);
                this._audio.appendChild(srcElement);
            }

            this.readyStateCheck();
        },
        // Unload the ES.
        unload: function () {
            if (this.seekerViewModel && typeof (this.seekerViewModel.stopSeekPositionUpdater) === "function")
                this.seekerViewModel.stopSeekPositionUpdater();
        },
        // Play from the given offset.
        play: function (offset, experienceStreamId) {
            try {
                var epsilon = .05; // Ignore minute seeks.
                if (Math.abs(this._audio.currentTime - (this._startMarker + offset)) > epsilon) {
                    this._seekAudio(offset, experienceStreamId);
                }
                this._audio.play();
            } catch (e) { rin.internal.debug.assert(false, "exception at audio element " + e.Message) }

            // Call play on parent to maintain keyframe integrity.
            AudioES.parentPrototype.play.call(this, offset, experienceStreamId);
        },
        // Pause at the given offset.
        pause: function (offset, experienceStreamId) {
            try {
                var epsilon = .05; // Ignore minute seeks.
                if (Math.abs(this._audio.currentTime - (this._startMarker + offset)) > epsilon) {
                    this._seekAudio(offset, experienceStreamId);
                }
                this._audio.pause();
            } catch (e) { rin.internal.debug.assert(false, "exception at audio element " + e.Message) }

            // Call pause on parent to maintain keyframe integrity.
            AudioES.parentPrototype.pause.call(this, offset, experienceStreamId);
        },
        // Set the base volume for the ES. This will get multiplied with the keyframed volume to get to the final applied volume.
        setVolume: function (baseVolume) {
            this._baseVolume = baseVolume;

            if (this._audio && typeof this._audio.volume !== 'undefined') {
                this._audio.volume = this._baseVolume * this._keyframedVolume;
            }
        },
        // Mute or Unmute the audio.
        setIsMuted: function (value) {
            if (this._audio && typeof this._audio.muted !== 'undefined') {
                this._audio.muted = value;
            }
        },

        // Method called by a popup control for getting popup specific interaction controls.
        getInteractionControlsForPopup: function () {
            var self = this;
            if (!self._interactionControls) {
                self._interactionControls = document.createElement("div");

                self._orchestrator.getInteractionControls([rin.contracts.interactionControlNames.mediaControl],
                    function (wrappedInteractionControls) {
                        rin.util.assignAsInnerHTMLUnsafe(self._interactionControls, wrappedInteractionControls.innerHTML);

                        var playPauseUIControl = $(".rin_PlayPauseContainer", self._interactionControls);
                        var volumeUIControl = $(".rin_VolumeControl", self._interactionControls);
                        var timelineUIControl = $(".rin_TimelineHolder", self._interactionControls);

                        var seekerViewModel = new rin.internal.MediaSeekerControllerViewModel(self._video, self),
                            playPauseViewModel = new rin.internal.MediaPlayPauseControllerViewModel(self._video),
                            volumeControlViewModel = new rin.internal.VolumeControllerViewModel(self._orchestrator),
                            playPauseControl = new rin.internal.ui.PlayPauseControl(playPauseUIControl, playPauseViewModel),
                            volumeControl = new rin.internal.ui.VolumeControl(volumeUIControl, volumeControlViewModel),
                            timelineControl = new rin.internal.ui.SeekerControl(timelineUIControl, seekerViewModel);

                        seekerViewModel.initialize();
                        playPauseViewModel.initialize();
                        volumeControlViewModel.initialize();

                        //playPauseControl.setVM(playPauseViewModel);
                        volumeControl.setVM(volumeControlViewModel);
                        timelineControl.setVM(seekerViewModel);

                        seekerViewModel.startSeekPositionUpdater();
                        self.seekerViewModel = seekerViewModel;
                        volumeControl.volumeChangedEvent.subscribe(function (value) {
                            volumeControlViewModel.setVolumeInPercent(value);
                        });
                        timelineControl.seekTimeChangedEvent.subscribe(function (value) {
                            seekerViewModel.setSeekPositionPercent(value);
                        });
                    });
            }
            return self._interactionControls;
        },

        // Seek to a position in the audio.
        _seekAudio: function (offset, experienceStreamId) {
            // Update task timer to new offset
            // Reset volume to default before loading keyframe
            this._keyframedVolume = 1;

            // Make sure keyframed volume is updated to default in case there was no keyframe before the seeked offset
            if (this._audio && typeof this._audio.volume !== 'undefined') {
                this._audio.volume = this._baseVolume * this._keyframedVolume;
            }

            offset += this._startMarker;
            // See if the video element is ready.
            if (this._audio.readyState == this.CONST_READY_STATE) {
                // In IE, video cannot seek before its initialTime. This property doesn't exist in Chrome.
                if (this._audio.initialTime) {
                    offset = Math.max(offset, this._audio.initialTime);
                }

                // See if we can seek to the specified offset.
                if (this._audio.seekable) {
                    for (var i = 0; i < this._audio.seekable.length; i++) {
                        if (this._audio.seekable.start(i) <= offset && offset <= this._audio.seekable.end(i)) {
                            this._audio.currentTime = offset;
                            return;
                        }
                    }
                }
                else {
                    // No, we have to reload, then seek.
                    this.load(experienceStreamId);
                }
            }
            else {
                this._desiredAudioPositon = offset;
            }
        },
        // Apply/Interpolate to a keyframe.
        displayKeyframe: function (keyframeData, nextKeyframeData, interpolationOffset) {
            var curKeyVolume, nextKeyVolume = null;

            // If there is another keyframe following current one, load that for interpolation.
            if (nextKeyframeData) {
                var nextData = new rin.internal.XElement(nextKeyframeData.data["default"]);
                if (nextData)
                    nextKeyVolume = parseFloat(nextData.attributeValue("Volume"));
            }

            // Load current keyframe.
            var curData = new rin.internal.XElement(keyframeData.data["default"]);
            if (curData) {
                curKeyVolume = parseFloat(curData.attributeValue("Volume"));

                // start volume interpolation to next key volume if one is present.
                if (nextKeyVolume != null) {
                    var keyframeDuration = nextKeyframeData.offset - keyframeData.offset;
                    var animation = new rin.internal.DoubleAnimation(keyframeDuration, curKeyVolume, nextKeyVolume);
                    curKeyVolume = animation.getValueAt(interpolationOffset);
                    if (this._audio && typeof this._audio.volume !== 'undefined') {
                        this._animateVolume(curKeyVolume, nextKeyVolume, keyframeDuration - interpolationOffset);
                    }
                }

                // Apply current keyframe values.
                this._keyframedVolume = curKeyVolume;
                if (this._audio && typeof this._audio.volume !== 'undefined') {
                    this._audio.volume = Math.min(1, this._keyframedVolume * this._baseVolume);
                }
            }
        },
        // Interpolate volume for smooth fade in and out.
        _animateVolume: function (from, to, animationTime) {
            var self = this;
            var volumeAnimation = new rin.internal.DoubleAnimation(animationTime, from, to);
            var volumeAnimationStoryboard = new rin.internal.Storyboard(
                volumeAnimation,
                function (value) {
                    self._keyframedVolume = Math.max(0, value);
                    self._audio.volume = Math.min(1, self._keyframedVolume * self._baseVolume);
                },
                function () { self._activeVolumeAnimation = null; });

            if (this._activeVolumeAnimation !== null) {
                this._activeVolumeAnimation.stop();
                this._activeVolumeAnimation = null;
            }

            volumeAnimationStoryboard.begin();
            this._activeVolumeAnimation = volumeAnimationStoryboard;
        },
        CONST_READY_STATE: 4,
        _desiredAudioPositon: -1, // Store audio seek location in case of audio is not yet ready.
        _url: null,
        _activeVolumeAnimation: null, // storyboard of an active volume interpolation.
        _baseVolume: 1, // volume from orchestrator.
        _startMarker: 0, // trim start of the audio clip.
        _keyframedVolume: 1, // current keyframed volume.
        _interactionControls: null,
        // List of formats supported by the ES. Browser will pick the first one which it supports.
        // All the below sources are added to the Audio tag irrespective of the source file format.
        _supportedFormats : [
            { ext: "ogg", type: "audio/ogg; codecs=\"theora, vorbis\"" },
            { ext: "mp3", type: "audio/mp3" },
            { ext: "mp4", type: "audio/mp4" },
            { ext: "aac", type: "audio/aac" },
            { ext: "wav", type: "audio/wav" }
        ]
    };

    AudioES.elementHTML = "<audio style='height:0;width:0' preload='auto'>Sorry, Your browser does not support HTML5 audio.</audio>";
    rin.util.overrideProperties(AudioES.prototypeOverrides, AudioES.prototype);
    rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.AudioExperienceStream", function (orchestrator, esData) { return new AudioES(orchestrator, esData); });
})(rin);﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../core/TaskTimer.js" />
/// <reference path="http://ecn.dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0"/>

window.rin = window.rin || {};

(function (rin) {
    // ES for displaying bing maps.
    var MapES = function (orchestrator, esData) {
        var self = this;

        this._orchestrator = orchestrator;
        this._userInterfaceControl = rin.util.createElementWithHtml(MapES.elementHtml).firstChild;
        this._esData = esData;

        this._userInterfaceControl.addEventListener('mousedown', function () {
            self._orchestrator.onESEvent(rin.contracts.esEventIds.interactionActivatedEventId, null);
        }, true);
    };

    rin.util.extend(rin.contracts.DiscreteKeyframeESBase, MapES);

    MapES.prototypeOverrides = {
        _initMap: function (experienceStreamId) {
            // Create the map control.
            var mapOptions = {
                credentials: "AnEde1n9Se4JmFkyw76VxdSkFfSMm5bUaT1qp5ClQDw65KEtLsG0uyXWYtzWobgk",
                mapTypeId: Microsoft.Maps.MapTypeId.road,
                labelOverlay: Microsoft.Maps.LabelOverlay.hidden,
                enableClickableLogo: false,
                enableSearchLogo: false,
                showDashboard: false,
                showScalebar: false,
                showCopyright: false,
                backgroundColor: new Microsoft.Maps.Color(0, 0, 0, 0)
            };

            this._map = new Microsoft.Maps.Map(this._userInterfaceControl, mapOptions);

            // Use the base class to load the keyframes and seek to experienceStreamId.
            MapES.parentPrototype.load.call(this, experienceStreamId);

            // Set the state to Ready.
            this.setState(rin.contracts.experienceStreamState.ready);
        },
        load: function (experienceStreamId) {
            var self = this;
            if (window.MSApp && WinJS) {
                // Create the map control.
                Microsoft.Maps.loadModule('Microsoft.Maps.Map', {
                    callback: function () {
                        self._initMap(experienceStreamId);
                    },
                    culture: "en-us",
                    homeRegion: "US"
                });
            }
            else {
                this._initMap(experienceStreamId);
            }
        },
        unload: function () {
            MapES.parentPrototype.unload.call(this, experienceStreamId);
            if (typeof this._map != 'undefined' && this._map != null) {
                this._map.dispose();
                this._map = null;
            }
        },
        displayKeyframe: function (keyframeData) {
            var data = new rin.internal.XElement(keyframeData.data["default"]);
            if (data) {
                var viewOptions = { animate: true };
                var mapBoundsKeyframe = data.element("MapBoundsKeyframe");
                if (mapBoundsKeyframe) {
                    var north = parseFloat(mapBoundsKeyframe.attributeValue("North"));
                    var west = parseFloat(mapBoundsKeyframe.attributeValue("West"));
                    var south = parseFloat(mapBoundsKeyframe.attributeValue("South"));
                    var east = parseFloat(mapBoundsKeyframe.attributeValue("East"));
                    viewOptions.bounds = Microsoft.Maps.LocationRect.fromCorners(new Microsoft.Maps.Location(north, west), new Microsoft.Maps.Location(south, east));
                }
                var mapStyleKeyframe = data.element("MapStyleKeyframe");
                if (mapStyleKeyframe) {
                    var mapStyle = mapStyleKeyframe.attributeValue("Style");
                    switch (mapStyle) {
                        case "Road":
                            viewOptions.mapTypeId = Microsoft.Maps.MapTypeId.road;
                            break;
                        case "Aerial":
                            // TODO: Switch labels off.
                            viewOptions.mapTypeId = Microsoft.Maps.MapTypeId.aerial;
                            break;
                        case "AerialWithLabels":
                            // TODO: Switch labels on.
                            viewOptions.mapTypeId = Microsoft.Maps.MapTypeId.aerial;
                            break;
                        case "Vector":
                            // TODO: Hide the default map tile layer.
                            viewOptions.mapTypeId = Microsoft.Maps.MapTypeId.road;
                            break;
                    }
                }

                // [Aldo] There is some issue with the way we are organizing the div's i guess, in IE9, map keyframes are not rendered properly.
                //        Below changes in height and width is a hack to fix the issue. This makes the browser relayout the divs and it works fine.
                this._userInterfaceControl.style["height"] = "99.9999%";
                this._userInterfaceControl.style["width"] = "99.9999%";
                var self = this;
                setTimeout(function () {
                    self._userInterfaceControl.style["height"] = "100%";
                    self._userInterfaceControl.style["width"] = "100%";
                    self._map.setView(viewOptions);
                }, 1);
            }
        },

        // Pan the map by the given distance and direction.
        panBy: function (x, y) {
            var bounds = this._map.getBounds();
            var pixelCenter = this._map.tryLocationToPixel(bounds.center);
            pixelCenter.x += x;
            pixelCenter.y += y;

            var options = this._map.getOptions();
            options.center = this._map.tryPixelToLocation(pixelCenter);
            options.zoom = this._map.getZoom();
            this._map.setView(options);
        },

        // Zoom in to the Map.
        zoomInCommand: function () {
            var options = this._map.getOptions();
            options.zoom = this._map.getZoom() + 1;
            this._map.setView(options);
        },

        // Zoom out from the Map.
        zoomOutCommand: function () {
            var options = this._map.getOptions();
            options.zoom = this._map.getZoom() - 1;
            this._map.setView(options);
        },

        // Methods to pan the map.
        panLeftCommand: function () {
            this.panBy(-this._panDistance, 0);
        },
        panRightCommand: function () {
            this.panBy(this._panDistance, 0);
        },
        panUpCommand: function () {
            this.panBy(0, -this._panDistance);
        },
        panDownCommand: function () {
            this.panBy(0, this._panDistance);
        },

        // Get interaction controls for Map.
        getInteractionControls: function () {
            var self = this;
            if (!self._interactionControls) {
                self._interactionControls = document.createElement("div");

                self._orchestrator.getInteractionControls([rin.contracts.interactionControlNames.panZoomControl],
                    function (wrappedInteractionControls) {
                        rin.util.assignAsInnerHTMLUnsafe(self._interactionControls, wrappedInteractionControls.innerHTML);
                        ko.applyBindings(self, self._interactionControls);
                    });
            }

            return self._interactionControls;
        },

        _panDistance: 100, // default pan distance
        _interactionControls: null,
        _map: null
    };

    MapES.elementHtml = "<div style='height:100%;width:100%;position:absolute;background:black;'></div>";
    rin.util.overrideProperties(MapES.prototypeOverrides, MapES.prototype);
    rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.MapExperienceStream", function (orchestrator, esData) { return new MapES(orchestrator, esData); });
})(rin);﻿
/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../core/TaskTimer.js" />

window.rin = window.rin || {};

rin.PhotosynthES = function (orchestrator, esData) {
    this.stateChangedEvent = new rin.contracts.Event();
    this._orchestrator = orchestrator;
    this._userInterfaceControl = rin.util.createElementWithHtml(rin.PhotosynthES.elementHTML);
    this._esData = esData;
};

rin.PhotosynthES.prototype = {
    load: function (experienceStreamId) {
        this.setState(rin.contracts.experienceStreamState.ready);
    },
    play: function (offset, experienceStreamId) {
    },
    pause: function (offset, experienceStreamId) {
    },
    unload: function () {

    },
    getState: function () {
        return this._state;
    },
    setState: function (value) {
        if (this._state == value) return;
        var previousState = this._state;
        this._state = value;
        this.stateChangedEvent.publish(new rin.contracts.ESStateChangedEventArgs(previousState, value, this));
    },
    stateChangedEvent: new rin.contracts.Event(),
    getUserInterfaceControl: function () { return this._userInterfaceControl; },

    _userInterfaceControl: rin.util.createElementWithHtml(""),
    _orchestrator: null,
    _esData: null
};

rin.PhotosynthES.elementHTML = "<div style='width:100%;height:100%;color:white;font-size:24px'>Photosynth ES Placeholder: This is placeholder ES until we get HTML5 version...</div>";

rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.PhotosynthExperienceStream", function (orchestrator, esData) { return new rin.PhotosynthES(orchestrator, esData); });
﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../core/TaskTimer.js" />

window.rin = window.rin || {};

(function (rin) {
    // ES for displaying 360 degree panoramas.
    var PanoramicES = function (orchestrator, esData) {
        var self = this;
        this._orchestrator = orchestrator;
        this._userInterfaceControl = rin.util.createElementWithHtml(PanoramicES.elementHTML).firstChild;
        this._esData = esData;

        this._url = orchestrator.getResourceResolver().resolveResource(esData.resourceReferences[0].resourceId, esData.experienceId);

        // Check for any interactions on the ES and pause the player.
        this._userInterfaceControl.addEventListener('mousedown', function () {
            self._orchestrator.onESEvent(rin.contracts.esEventIds.interactionActivatedEventId, null);
        }, true);
    };

    rin.util.extend(rin.contracts.DiscreteKeyframeESBase, PanoramicES);

    PanoramicES.prototypeOverrides = {
        // Load and initialize the ES.
        load: function (experienceStreamId) {
            var self = this;
            // Call load on parent to init the keyframes.
            PanoramicES.parentPrototype.load.call(this, experienceStreamId);

            this.setState(rin.contracts.experienceStreamState.buffering);
            rin.internal.debug.write("Load called for " + this._url);

            // dispose previous viewer if it exists
            if (this._viewer) {
                this._viewer.dispose();
            }

            // Extract the cid of the pano from the url
            var cidStartIndex = self._url.indexOf("cid=");
            if (cidStartIndex > 0) {
                var cid = self._url.substring(cidStartIndex + 4);

                // As of now we are assuming only photosynth panos.
                // fetch the rml that defines the panoramic view
                PhotosynthRml.createFromCid(cid, function (rml) {
                    if (rml) {
                        self._createViewer(rml);
                        // signal to RIN that we are ready
                        self.setState(rin.contracts.experienceStreamState.ready);
                    }
                    self.setState(rin.contracts.experienceStreamState.error);
                });
            }
        },
        // Pause the ES.
        pause: function (offset, experienceStreamId) {
            // Call pause on parent to sync the keyframes.
            PanoramicES.parentPrototype.load.call(this, experienceStreamId);
            if (this._activeViewportAnimationStoryboard) {
                this._activeViewportAnimationStoryboard.stop();
                this._activeViewportAnimationStoryboard = null;
            }
        },
        // Display a keyframe.
        displayKeyframe: function (keyframeData, nextKeyframeData, interpolationOffset) {
            // If there is no following keyframe, just apply the current frame.
            if (!nextKeyframeData) {
                this._setCamera(keyframeData.data);
                return;
            }

            // Else interpolate to the next keyframe.
            var keyframeDuration = nextKeyframeData.offset - keyframeData.offset;
            if (typeof interpolationOffset == "number" && interpolationOffset > 0) {
                var animation = new rin.internal.DoubleAnimation(keyframeDuration, keyframeData.data, nextKeyframeData.data);
                var currentValue = animation.getValueAt(interpolationOffset);
                this._setCamera(currentValue);
                keyframeDuration -= interpolationOffset;
            }
            else {
                this._setCamera(keyframeData.data);
            }

            if (this.isLastActionPlay) {
                this._animateToKeyframe(nextKeyframeData.data, keyframeDuration);
            }
        },
        // Helper method to animate the viewport to a given viewport.
        _animateToKeyframe: function (targetViewport, animationTime) {
            if (!targetViewport) return;
            var self = this;

            if (animationTime <= 0) {
                this._setCamera(targetViewport);
                return;
            }

            if (this._viewer) {
                var cameraController = this._viewer.getActiveCameraController();
                var pitchAndHeading = cameraController.getPitchAndHeading();
                var currentViewPort = { fov: cameraController.getVerticalFov(), pitch: pitchAndHeading[0], heading: pitchAndHeading[1] };

                var viewportAnimation = new rin.internal.DoubleAnimation(animationTime, currentViewPort, targetViewport);
                var viewportStoryboard = new rin.internal.Storyboard(
                    viewportAnimation,
                    function (value) {
                        self._setCamera(value);
                    },
                    function () { self._activeViewportAnimationStoryboard = null; });

                if (this._activeViewportAnimationStoryboard) {
                    this._activeViewportAnimationStoryboard.stop();
                    this._activeViewportAnimationStoryboard = null;
                }

                viewportStoryboard.begin();
                this._activeViewportAnimationStoryboard = viewportStoryboard;
            }
        },
        // Set the camera parameters.
        _setCamera: function (data) {
            var cameraController = this._viewer.getActiveCameraController();

            cameraController.setVerticalFov(data.fov, false);
            cameraController.setPitchAndHeading(data.pitch, data.heading, false);
        },
        _viewer: null,
        // Create a pano viewer instance from the given rml.
        _createViewer: function (rml) {
            var self = this;
            this._viewer = new RwwViewer(this._userInterfaceControl, {
                rml: rml,
                tileDownloadFailed: function (failCount, succeedCount) {
                    var total = failCount + succeedCount;
                    if (total > 4 && failCount > succeedCount) {
                        rin.internal.debug.write('tile download failures are high');
                    }
                },
                width: this._userInterfaceControl.offsetWidth,
                height: this._userInterfaceControl.offsetHeight,

                // OPTIONAL param.  Defaults to black with full opacity.
                //backgroundColor: { r: 0.4, g: 0.4, b: 0.4, a: 1}, 

                // OPTIONAL param.  Defaults to 'webgl' if available on the current
                // browser, else 'css'.  At the moment, it needs to be 'css', because
                // the imagery won't show in 'webgl' until we make some changes to the
                // HTTP response headers.
                renderer: 'css'
            });

            // Keep updating the viewer size to its parent size. Using below method as onresize if not fired on div consistantly on all browsers
            // TODO: May be there is a better approach?
            setInterval(function () {
                if (self._viewer.width !== self._userInterfaceControl.offsetWidth ||
                    self._viewer.height !== self._userInterfaceControl.offsetHeight) {

                    self._viewer.width = self._userInterfaceControl.offsetWidth;
                    self._viewer.height = self._userInterfaceControl.offsetHeight;

                    self._viewer.setViewportSize(self._userInterfaceControl.offsetWidth, self._userInterfaceControl.offsetHeight);
                };
            }, 300); // using 300 so that its not too slow nor too fast to eat up cpu cycles
        },
        // Get interaction controls for panorama.
        getInteractionControls: function () {
            var self = this;
            if (!self._interactionControls) {
                self._interactionControls = document.createElement("div");

                self._orchestrator.getInteractionControls([rin.contracts.interactionControlNames.panZoomControl],
                    function (wrappedInteractionControls) {
                        rin.util.assignAsInnerHTMLUnsafe(self._interactionControls, wrappedInteractionControls.innerHTML);
                        ko.applyBindings(self, self._interactionControls);
                    });
            }

            return self._interactionControls;
        },
        // Zoom and pan commands.
        zoomInCommand: function () {
            var cameraController = self._viewer.getActiveCameraController();
            cameraController.setVerticalFov(Math.max(.05, cameraController.getVerticalFov() * (1 - this._zoomFactor)), true);
        },
        zoomOutCommand: function () {
            var cameraController = self._viewer.getActiveCameraController();
            cameraController.setVerticalFov(Math.min(2, cameraController.getVerticalFov() * (1 + this._zoomFactor)), true);
        },
        panLeftCommand: function () {
            var cameraController = self._viewer.getActiveCameraController();
            var currentPitchAndHeading = cameraController.getPitchAndHeading();
            cameraController.setPitchAndHeading(currentPitchAndHeading[0], currentPitchAndHeading[1] - (this._panDistance * cameraController.getVerticalFov()), true);
        },
        panRightCommand: function () {
            var cameraController = self._viewer.getActiveCameraController();
            var currentPitchAndHeading = cameraController.getPitchAndHeading();
            cameraController.setPitchAndHeading(currentPitchAndHeading[0], currentPitchAndHeading[1] + (this._panDistance * cameraController.getVerticalFov()), true);
        },
        panUpCommand: function () {
            var cameraController = self._viewer.getActiveCameraController();
            var currentPitchAndHeading = cameraController.getPitchAndHeading();
            cameraController.setPitchAndHeading(currentPitchAndHeading[0] + (this._panDistance * cameraController.getVerticalFov()), currentPitchAndHeading[1], true);
        },
        panDownCommand: function () {
            var cameraController = self._viewer.getActiveCameraController();
            var currentPitchAndHeading = cameraController.getPitchAndHeading();
            cameraController.setPitchAndHeading(currentPitchAndHeading[0] - (this._panDistance * cameraController.getVerticalFov()), currentPitchAndHeading[1], true);
        },

        _interactionControls: null,
        _zoomFactor: .2,
        _panDistance: .3
    };

    PanoramicES.elementHTML = "<div style='height:100%;width:100%;background-color:black;position:absolute;'></div>";
    rin.util.overrideProperties(PanoramicES.prototypeOverrides, PanoramicES.prototype);
    rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.PanoramicExperienceStream", function (orchestrator, esData) { return new PanoramicES(orchestrator, esData); });
})(rin);
﻿/// <reference path="../core/Common.js"/>
/// <reference path="../core/TaskTimer.js"/>
/// <reference path="../core/ESItem.js"/>
/// <reference path="../core/ESTimer.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="../core/ScreenPlayInterpreter.js"/>
/// <reference path="../core/Orchestrator.js"/>
/// <reference path="../core/ESItemsManager.js"/>
/// <reference path="../core/EventLogger.js"/>
/// <reference path="../player/DefaultController.js" />
/// <reference path="../player/ControllerViewModel.js"/>

window.rin = window.rin || {};

rin.internal.PlayerControllerES = function () {
    "use strict";
    this.stateChangedEvent = new rin.contracts.Event();
};

rin.internal.PlayerControllerES.prototype = {
    isSystemES: true,
    orchestrator: null,
    _playerController: null,
    _playerControllerViewModel: null,

    initialize: function (playerElement, playerConfiguration) {
        "use strict";
        var self = this,
            stageElement,
            playPauseVM,
            seekerVM,
            volumeVM,
            troubleshootVM,
            playerControllerControl,
            onNarrativeLoaded = function () {
                var systemRoot = self.orchestrator.getResourceResolver().resolveSystemResource("");
                self._playerControllerViewModel.initialize();
                rin.defLoader = rin.defLoader || new rin.internal.DeferredLoader();
                rin.defLoader.loadAllThemeResources(systemRoot).then(function () {
                    self._playerController = new rin.internal.ui.DefaultController(self._playerControllerViewModel);
                    self._playerController.initStageArea(self.playerControl.getStageControl(), self.playerControl.getPlayerRoot());
                    playerControllerControl = self._playerController.getUIControl();
                    self._playerController.volumeChangedEvent.subscribe(function (value) {
                        volumeVM.setVolumeInPercent(value);
                    });
                    self._playerController.seekTimeChangedEvent.subscribe(function (value) {
                        seekerVM.setSeekPositionPercent(value);
                    });
                    self._playerController.showControlsEvent.subscribe(function () {
                        self._playerControllerViewModel.showControls(true);
                    });
                    self._playerController.hideControlsEvent.subscribe(function () {
                        if (self.orchestrator.getPlayerState() !== rin.contracts.playerState.pausedForExplore) {
                            if (playPauseVM.isPlaying()) {
                                self._playerControllerViewModel.showControls(false);
                            }
                        }
                    });
                    self._playerController.showHideTroubleShootingControls.subscribe(function () {
                        self._playerControllerViewModel.changeTroubleShootControlsVisibilty();
                    });
                    self._playerControllerViewModel.troubleShooterVM.startSeekPositionUpdater();
                    self._playerControllerViewModel.seekerVM.startSeekPositionUpdater();
                });
            };

        stageElement = document.createElement("div");
        stageElement.style.position = "relative";
        stageElement.style.width = "100%";
        stageElement.style.height = "100%";

        this.playerControl = new rin.internal.PlayerControl(stageElement, playerConfiguration, playerElement);
        this.orchestrator = this.playerControl.orchestrator;
        this._playerControllerViewModel = new rin.internal.PlayerControllerViewModel(this.orchestrator);
        playPauseVM = this._playerControllerViewModel.playPauseVM;
        seekerVM = this._playerControllerViewModel.seekerVM;
        volumeVM = this._playerControllerViewModel.volumeVM;
        troubleshootVM = this._playerControllerViewModel.troubleShooterVM;

        this.orchestrator.narrativeLoadedEvent.subscribe(onNarrativeLoaded, null, this);
        this._playerControllerViewModel.interactionControls.subscribe(function () {
            var interactionControls = self._playerControllerViewModel.interactionControls();
            self._playerController.setInteractionControls(interactionControls);
        });

    },
    load: function (experienceStreamId) {
        "use strict";
    },
    play: function (offset, experienceStreamId) {
        "use strict";
        this._playerControllerViewModel.playPauseVM.isPlaying(true);
    },
    pause: function (offset, experienceStreamId) {
        "use strict";
        this._playerControllerViewModel.playPauseVM.isPlaying(false);
    },
    unload: function () {
        "use strict";
        this._playerControllerViewModel.seekerVM.stopSeekPositionUpdater();
        this._playerControllerViewModel.troubleShooterVM.stopSeekPositionUpdater();
    },
    getState: function () {
        "use strict";
        return rin.contracts.experienceStreamState.ready;
    },
    stateChangedEvent: null,
    getUserInterfaceControl: function () {
        "use strict";
        return null;
    },
    getControllerVM: function () {
        "use strict";
        return this._playerControllerViewModel;
    },
    playerControl: null
};﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
//-- New Knockout binding to handle both tap and click.
ko.bindingHandlers.clickOrTouch = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        $(element).rinTouchGestures(function (e, touchGesture) {
            if (touchGesture.gesture == 'simpletap') {
                var handlerFunction = valueAccessor() || {};
                if (!handlerFunction)
                    return;
                try {
                    var argsForHandler = rin.util.makeArray(arguments);
                    argsForHandler.unshift(viewModel);
                    handlerFunction.apply(viewModel, argsForHandler);
                } finally { }
            }
        }, { simpleTap: true, swipe: false });
        return null;
    }
};

rin.ContentBrowserES = function (orchestrator, esData, themeName, dimension) {
    this._orchestrator = orchestrator;
    this._esData = esData;
    this._themeName = themeName;
    this._dimension = dimension;
    var resourceResolver = this._orchestrator.getResourceResolver();
    var htmlfile = resourceResolver.resolveSystemResource('contentbrowser/' + dimension + '.htm');
    var jsfile = resourceResolver.resolveSystemResource('contentbrowser/' + dimension + '.js');

    this._userInterfaceControl = document.createElement("div");
    this._userInterfaceControl.style.width = "100%";
    this._userInterfaceControl.style.height = "100%";
    this._userInterfaceControl.style.position = "absolute";

    var self = this;
    //--Download the theme based htm file
    var htmlDownload = {
        url: htmlfile,
        dataType: "html",
        error: function (jqxhr, textStatus, errorThrown) {
            self.setState(rin.contracts.experienceStreamState.error);
            self._orchestrator.eventLogger.logErrorEvent("Error: {0} downloading the html file: {1}", exception.Message, htmlfile);
        },
        success: function (data, textStatus, jqxhr) {
            self._elementHtml = data;
            self._isHtmlLoaded = true;
            self._updateView();
        }
    };
    $.ajax(htmlDownload);

    //--Download the js file associated with the current CB
    $.getScript(jsfile)
    .done(function (script, textStatus) {
        self._isJsLoaded = true;
        self._updateView();
    })
    .fail(function (jqxhr, settings, exception) {
        self.setState(rin.contracts.experienceStreamState.error);
        self._orchestrator.eventLogger.logErrorEvent("Error: {0} downloading the js file: {1}", exception.Message, jsfile);
    });

    var control = this._userInterfaceControl;
    var lastZIndex = 0;
    this._userInterfaceControl.hide = function () {
        lastZIndex = control.style.zIndex;
        control.style.zIndex = 0;
    }
    this._userInterfaceControl.unhide = function () {
        control.style.zIndex = lastZIndex;
        this._userInterfaceControl.opacity = 1;
    }
    this._collectionData = {};

    //--Bind the mouseup to fire interaction event
    $(this._userInterfaceControl).bind("mouseup", function (e) {
        self._orchestrator.onESEvent(rin.contracts.esEventIds.interactionActivatedEventId, null);
    });
    //Set the initial state to buffering and load the 
    this.setState(rin.contracts.experienceStreamState.buffering);
    this._loadCollectionJSON();
};

rin.ContentBrowserES.prototype = new rin.contracts.DiscreteKeyframeESBase();
rin.ContentBrowserES.base = rin.contracts.DiscreteKeyframeESBase.prototype;
rin.ContentBrowserES.changeTrigger = { none: 0, onkeyframeapplied: 1, onnext: 2, onprevious: 3, onclick: 4 };
rin.ContentBrowserES.currentMode = { preview: 0, expanded: 1 };

rin.ContentBrowserES.prototypeOverrides = {
    load: function (experienceStreamId) {
        rin.ContentBrowserES.base.load.call(this, experienceStreamId);

        if (this._esData.data["default"] != undefined) {
            this._showFilmstripAlways = (new rin.internal.XElement(this._esData.data["default"]).elementValue("ShowFilmstripAlways", false) == "true");
            this._showDescriptionByDefault = (new rin.internal.XElement(this._esData.data["default"]).elementValue("ShowDescriptionByDefault", false) == "true");
        }
    },

    unload: function () {
        rin.ContentBrowserES.base.unload.call(this);
    },

    setDataContext: function (collectionData) {
        //--Bind the UI to the viewmodel
        if (collectionData.groupsList.length > 0) {
            this.collectionViewModel = this.getViewModel(collectionData, this._orchestrator);
            this._isJSONLoaded = true;
            this._updateView();
        }
    },

    getCapturedKeyframe: function (keyframeData) {
        if (typeof keyframeData != undefined) {
            return keyframeData;
        }
        return null;
    },

    displayKeyframe: function (keyframeData) {
        if (keyframeData != undefined) {
            var dataElement = keyframeData.data["kf-selstate"];
            if (dataElement != undefined) {
                this.goToState(dataElement);
            }
        }
    },

    addedToStage: function () {
    },

    removedFromStage: function () {
        // this._orchestrator.onESEvent(this, rin.contracts.esEventIds.showControls, null); //todo: investigate what needs to happen here. Do we really need showControls esEvent?
    },

    getCurrentState: function () { return null; },

    goToState: function (artifactState) {
        if (this.collectionViewModel === undefined)
            return;
        //--Get the group/item to be selected and call Applykeyframe on it.
        for (var item in artifactState) {
            var itemId = artifactState[item].itemId;

            var selectedGroup = this.collectionViewModel.groups.firstOrDefault(function (group) { return group.id == item; });

            if (selectedGroup) {
                var selectedItem = selectedGroup.itemsList.firstOrDefault(function (item) { return item.id == itemId; });
                if (selectedItem && selectedItem.id !== this.collectionViewModel.currentItem().id) {
                    this.collectionViewModel.onApplyKeyframe(selectedItem);
                }
            }
        }
    },

    toggleDescription: function (isDescVisible) { },

    toggleFilmstrip: function (isFilmstripVisible) { },

    //--Populates the viewmodel
    getViewModel: function (collectionData, orchestrator) {
        var collectionViewModel = {
            orchestrator: orchestrator,
            title: collectionData.title, //collection title
            description: collectionData.description, //collection description
            groups: collectionData.groupsList, //--the groups list along with the items in it
            itemUpdateTrigger: rin.ContentBrowserES.changeTrigger.none,
            previousItem: {}, //--the item that was previously selected
            currentMode: rin.ContentBrowserES.currentMode.preview, //--current mode of CB - is it in expanded mode or preview
            currentItem: ko.observable({}), //--currently selected item
            isLastItem: ko.observable(false),
            isFirstItem: ko.observable(false),
            initViewModel: function () {
                if (this.groups.length > 0 && this.groups[0].itemsList.length > 0) {
                    this.currentItem(this.groups[0].itemsList[0]);
                    this.isFirstItem(true);
                }
            },
            onPrevious: function () {
                var groupIndex = self.currentItem().groupIndex;
                var index = self.groups[groupIndex].itemsList.indexOf(self.currentItem());
                self.beforeSelectionChange();

                if (index > 0) {
                    index--;
                }
                else if (index === 0 && groupIndex > 0) {
                    groupIndex--;
                    index = self.groups[groupIndex].itemsList.length - 1;
                }
                else
                    return;
                self.itemUpdateTrigger = rin.ContentBrowserES.changeTrigger.onprevious;
                self.afterSelectionChange(groupIndex, index);
            },
            onNext: function () {
                var groupIndex = self.currentItem().groupIndex;
                var index = self.groups[groupIndex].itemsList.indexOf(self.currentItem());
                self.beforeSelectionChange();

                if (index < self.groups[groupIndex].itemsList.length - 1) {
                    index++;
                }
                else if (index === (self.groups[groupIndex].itemsList.length - 1) && groupIndex < (self.groups.length - 1)) {
                    groupIndex++;
                    index = 0;
                }
                else
                    return;
                self.itemUpdateTrigger = rin.ContentBrowserES.changeTrigger.onnext;
                self.afterSelectionChange(groupIndex, index);
            },
            onMediaClick: function (selecteditem) {
                self.previousItem = self.currentItem();
                self.beforeSelectionChange();
                var index = self.groups[selecteditem.groupIndex].itemsList.indexOf(selecteditem);
                self.itemUpdateTrigger = rin.ContentBrowserES.changeTrigger.onclick;
                self.afterSelectionChange(selecteditem.groupIndex, index);
            },
            onApplyKeyframe: function (selecteditem) {
                self.previousItem = self.currentItem();
                self.beforeSelectionChange();
                var index = self.groups[selecteditem.groupIndex].itemsList.indexOf(selecteditem);
                self.itemUpdateTrigger = rin.ContentBrowserES.changeTrigger.onkeyframeapplied;
                self.afterSelectionChange(selecteditem.groupIndex, index);
            },
            onExplore: function () {
                //When clicked on a preview image, launch a popup, or go to expanded mode
                self.getItemESData(self.currentItem());
                var popup = new rin.PopupControl(self.orchestrator);
                popup.load({ "DataContext": self.currentItem().esData }, self);
                self.currentMode = rin.ContentBrowserES.currentMode.expanded;

                $(popup).bind('onclose', function (e) {
                    self.currentMode = rin.ContentBrowserES.currentMode.preview;
                });
            },
            beforeSelectionChange: function () {
                self.isFirstItem(false);
                self.isLastItem(false);
                self.itemUpdateTrigger = rin.ContentBrowserES.changeTrigger.none;
            },
            afterSelectionChange: function (groupIndex, index) {
                if (index === 0 && groupIndex === 0)
                    self.isFirstItem(true);
                else if (index === (self.groups[groupIndex].itemsList.length - 1) && groupIndex === (self.groups.length - 1))
                    self.isLastItem(true);

                self.previousItem = self.currentItem();

                var selectedItem = self.groups[groupIndex].itemsList[index];
                if (self.currentMode == rin.ContentBrowserES.currentMode.expanded) {
                    self.getItemESData(selectedItem);
                }

                self.currentItem(selectedItem);
            },
            getItemESData: function (itemData) {
                if (itemData.esData === undefined) {
                    itemData.esData = rin.internal.esDataGenerator.getExperienceStream(itemData);
                }
            }
        };
        var self = collectionViewModel;
        collectionViewModel.initViewModel();
        return collectionViewModel;
    },
    _updateView: function () {
        //--once html, associated javascript and the collection data model are all loaded
        //--create and append the view, apply bindings and initialize the view javascript
        if (this._isHtmlLoaded && this._isJsLoaded && this._isJSONLoaded) {
            this._userInterfaceControl.appendChild(rin.util.createElementWithHtml(this._elementHtml).firstChild);
            ko.applyBindings(this.collectionViewModel, this._userInterfaceControl.firstChild);

            var viewLoad = this._themeName + this._dimension;
            if (viewLoad in rin.ContentBrowserES)
                new rin.ContentBrowserES[viewLoad](this._userInterfaceControl.firstChild);
        }
    },
    _loadCollectionJSON: function () {
        //--from the es data, load the collection json
        var resourceResolver = this._orchestrator.getResourceResolver();
        var resourceName = resourceResolver.resolveResource(this._esData.resourceReferences[0].resourceId, this._esData.experienceId);

        if (resourceName) {
            var self = this;

            rin.internal.JSONLoader.loadJSON(resourceName, function (data, jsonUrl) {
                self._collectionData = rin.internal.JSONLoader.processCollectionJSON(jsonUrl, data[0].collection, resourceResolver);
                self.setDataContext(self._collectionData);
                self.setState(rin.contracts.experienceStreamState.ready);
                self.displayKeyframe(self._lastKeyframe);
            }, function (error, jsonUrl) {
                self.setState(rin.contracts.experienceStreamState.error);
                self._orchestrator.eventLogger.logErrorEvent("Error: {0} downloading the json file: {1}", error, jsonUrl);
            });
        }
    }
};

rin.util.overrideProperties(rin.ContentBrowserES.prototypeOverrides, rin.ContentBrowserES.prototype);

rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.RinTemplates.MetroOneDTemplateES", function (orchestrator, esData) { return new rin.ContentBrowserES(orchestrator, esData, "Metro", "OneD"); });
rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.RinTemplates.MetroTwoDTemplateES", function (orchestrator, esData) { return new rin.ContentBrowserES(orchestrator, esData, "Metro", "OneD"); });
﻿/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../core/TaskTimer.js" />

window.rin = window.rin || {};

rin.OverlayES = function (orchestrator, esData) {
    this._orchestrator = orchestrator;

    this._userInterfaceControl = document.createElement("div");
    this._userInterfaceControl.style.width = "100%";
    this._userInterfaceControl.style.height = "100%";
    this._userInterfaceControl.style.position = "absolute";

    this._esData = esData;

    var contenttype = new rin.internal.XElement(esData.data.contentType).value();
    var lowercaseContent = contenttype.toLowerCase();
    if (lowercaseContent.indexOf("video") === 0)
        contenttype = "MediaOverlays";
    var resourceResolver = this._orchestrator.getResourceResolver();
    var htmlfile = resourceResolver.resolveSystemResource('overlays/' + contenttype + '.htm');

    var self = this;

    //--Download the theme based htm file
    var htmlDownload = {
        url: htmlfile,
        dataType: "html",
        error: function (jqxhr, textStatus, errorThrown) {
            self.setState(rin.contracts.experienceStreamState.error);
            self._orchestrator.eventLogger.logErrorEvent("Error: {0} downloading the html file: {1}", exception.Message, htmlfile);
        },
        success: function (data, textStatus, jqxhr) {
            self.elementHtml = data;
            self._isHtmlLoaded = true;
        }
    };
    $.ajax(htmlDownload);

    $(this._userInterfaceControl).bind("mousedown", function (e) {
        self._orchestrator.onESEvent(rin.contracts.esEventIds.interactionActivatedEventId, null);
    });

    this._userInterfaceControl.hide = function () {
        lastZIndex = control.style.zIndex;
        control.style.zIndex = -10000;
    };

    var self = this;

    //--from the es data, load the collection json
    var resourceResolver = this._orchestrator.getResourceResolver();
    var resourceName = resourceResolver.resolveResource(esData.resourceReferences[0].resourceId, esData.experienceId);
    this.setState(rin.contracts.experienceStreamState.buffering);

    if (resourceName) {
        rin.internal.JSONLoader.loadJSON(resourceName, function (data, jsonUrl) {
            self._collectionData = rin.internal.JSONLoader.processCollectionJSON(jsonUrl, data[0].collection, resourceResolver);
            self.setState(rin.contracts.experienceStreamState.ready);
            self.displayKeyframe(self._lastKeyframe);
            rin.internal.debug.write("Load called for collection" + jsonUrl);
        }, function (error, jsonUrl) {
            self.setState(rin.contracts.experienceStreamState.error);
            self._orchestrator.eventLogger.logErrorEvent("Error: {0} downloading the json file: {1}", error, jsonUrl);
        });
    }

    this._userInterfaceControl.unhide = function () { control.style.zIndex = lastZIndex; }
};

rin.OverlayES.prototype = new rin.contracts.DiscreteKeyframeESBase();
rin.OverlayES.base = rin.contracts.DiscreteKeyframeESBase.prototype;

rin.OverlayES.prototypeOverrides = {
    load: function (experienceStreamId) {
        rin.OverlayES.base.load.call(this, experienceStreamId);
        rin.internal.debug.write("Load ES called for " + this._url);
    },
    unload: function () {
        rin.OverlayES.base.unload.call(this);
    },
    getViewModel: function (itemId, collectionData, orchestrator) {
        var itemData = collectionData.items[itemId];
        if (itemData) {
            var self = this;
            var overlayViewModel = {
                overlayCollection: collectionData,
                orchestrator: orchestrator,
                currentItem: itemData,
                expandedItem: null,
                itemId: itemId,
                currentMode: rin.ContentBrowserES.currentMode.preview,
                isExpanded: ko.observable(false),
                isBlurbVisible: ko.observable(true),
                onClickMore: function () {
                    self.overlayViewModel.isExpanded(true);
                    self.overlayViewModel.isBlurbVisible(false);
                },
                onExplore: function () {
                    this.currentMode = rin.ContentBrowserES.currentMode.expanded;
                    if (this.currentItem.defaultExpandedModeBehavior) {
                        var behaviorFactory = rin.ext.getFactory(rin.contracts.systemFactoryTypes.behaviorFactory, this.currentItem.defaultExpandedModeBehavior);
                        if (behaviorFactory) {
                            var overlayBehavior = behaviorFactory(this.orchestrator);
                            if (overlayBehavior) {
                                overlayBehavior.executeBehavior({ "DataContext": this.currentItem, "CollectionData": this.overlayCollection }, function () {
                                    this.currentMode = rin.ContentBrowserES.currentMode.preview;
                                });
                            }
                        }
                    }
                }
            };
            if (typeof itemData.launchArtifact === "string") {
                overlayViewModel.expandedItem = collectionData.items[itemData.launchArtifact];
                this._subscribeToPlayerEvents(overlayViewModel);
            }
            if (typeof itemData.fontColor === "string") {
                if (itemData.fontColor.length > 6) {
                    itemData.fontColor = "#" + itemData.fontColor.substring(3);
                }
            }
            else {
                itemData.fontColor = "#fcfcfc";
            }
            return overlayViewModel;
        }
        return null;
    },
    _subscribeToPlayerEvents: function (overlayViewModel) {
        this._orchestrator.playerStateChangedEvent.unsubscribe(this._esData.experienceId);
        var self = this;
        this._orchestrator.playerStateChangedEvent.subscribe(function () {
            var playerState = self._orchestrator.getPlayerState();
            if (playerState == rin.contracts.playerState.playing) {
                self.overlayViewModel.isExpanded(false);
                self.overlayViewModel.isBlurbVisible(true);
            }
        }, this._esData.experienceId);
    },
    _createView: function () {
        //--once html, associated javascript and the collection data model are all loaded
        //--create and append the view
        if (this._isHtmlLoaded) {
            this._userInterfaceControl.appendChild(rin.util.createElementWithHtml(this.elementHtml).firstChild);
        }
    },
    _bindOverlay: function (itemId, show) {
        if (this._collectionData != null) {
            if (this._userInterfaceControl.firstChild == null) { this._createView(); }
            //--form the view model from the itemid and apply bindings
            var $control = $(this._userInterfaceControl);
            if (itemId) {
                if (typeof (this.overlayViewModel) === "undefined" || this.overlayViewModel.itemId != itemId) {
                    this.overlayViewModel = this.getViewModel(itemId, this._collectionData, this._orchestrator);
                    ko.applyBindings(this.overlayViewModel, this._userInterfaceControl.firstChild);
                }
                if (show === "true") $control.fadeIn();
                else $control.fadeOut();
            }
        }
    },
    displayKeyframe: function (keyframeData) {
        if (keyframeData != undefined) {
            var artifactState = keyframeData.data["ea-selstate"];
            if (artifactState != undefined) {
                for (var item in artifactState) {
                    var itemId = artifactState[item].itemid;
                    var show = artifactState[item].view.display.show;
                    this._bindOverlay(itemId, show);
                    rin.internal.debug.write("Display keyframe called for overlay item:" + itemId);
                }
            }
        }
    }
};

rin.util.overrideProperties(rin.OverlayES.prototypeOverrides, rin.OverlayES.prototype);

rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.TwodLayoutEngine", function (orchestrator, esData) { return new rin.OverlayES(orchestrator, esData); });
rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "microsoftResearch.rin.twodlayoutengine", function (orchestrator, esData) { return new rin.OverlayES(orchestrator, esData); });
﻿window.rin = window.rin || {};

rin.PopupControl = function (orchestrator) {
    this._orchestrator = orchestrator;

    var resourceResolver = this._orchestrator.getResourceResolver();
    //-- Download the relevant html and js files
    var htmlfile = resourceResolver.resolveSystemResource('popup/popup.htm');
    var jsfile = resourceResolver.resolveSystemResource('popup/popup.js');
    var _isHtmlLoaded, _isJsLoaded = false;
    var subscription = null;
    var self = this;

    var htmlDownload = {
        url: htmlfile,
        dataType: "html",
        error: function (jqxhr, textStatus, errorThrown) {
            popupViewModel.error(true);
            self._orchestrator.eventLogger.logErrorEvent("Error: {0} downloading html file: {1}", exception.Message, htmlfile);
        },
        success: function (data, textStatus, jqxhr) {
            self._elementHtml = data;
            _isHtmlLoaded = true;
            updateView();
        }
    };
    $.ajax(htmlDownload);

    $.getScript(jsfile)
    .done(function (script, textStatus) {
        _isJsLoaded = true;
        updateView();
    })
    .fail(function (jqxhr, settings, exception) {
        popupViewModel.error(true);
        self._orchestrator.eventLogger.logErrorEvent("Error: {0} downloading js file: {1}", exception.Message, jsfile);
    });

    //--External function to be called with experienceStreamData 
    //--and the datacontext(can be either a collectionViewModel or a plain collection Item)
    this.load = function (esData, dataContext) {
        populateViewModel(esData, dataContext);
        updateView();
    }

    //--Triggers a onclose event callback when the popup control closes.
    //--CB uses this to assess the mode it is currently in
    var close = function () {
        if (self._userInterfaceControl) {
            self._popupControl.close(function () {
                //unloadCurrentES();
                $(self._userInterfaceControl).detach();
                $(self).trigger('onclose', null);
            }, self);
        }
        //-- Dispose the subscription created for CurrentItem change in a collection mode
        if (subscription) {
            subscription.dispose();
        }
    }

    //    var unloadCurrentES = function () {
    //        if (self._experienceStream) {
    //            self._experienceStream.unload();
    //            self._experienceStream.stateChangedEvent.unsubscribe("popupcontrol");
    //        }
    //    }

    //    var loadCurrentES = function () {
    //        if (self._experienceStream) {
    //            self._experienceStream.stateChangedEvent.subscribe(function (args) { esStateChanged(args) }, "popupcontrol");
    //            popupViewModel.isESLoading(true);
    //            self._experienceStream.load();
    //        }
    //    }

    //    var esStateChanged = function (esStateChangedEventArgs) {
    //        if (esStateChangedEventArgs.toState == rin.contracts.experienceStreamState.error) {
    //            popupViewModel.error(true);
    //        }
    //        else if (esStateChangedEventArgs.toState == rin.contracts.experienceStreamState.ready ||
    //                esStateChangedEventArgs.toState == rin.contracts.experienceStreamState.closed) {
    //            popupViewModel.isESLoading(false);
    //        }
    //    }

    //--Update the ESData and the view when the current Item changes
    var onCurrentItemChange = function (newValue) {
        popupViewModel.esData = newValue.esData;
        updateView();
    }

    //Dummy popupview model, that can be extended 
    //based on the current datacontext 
    //(either with a collection data model in case of CB or a single item incase of Overlays)
    var popupViewModel = {
        esData: {},
        narrativeData: {},
        currentItem: ko.observable({}),
        isESLoading: ko.observable(false),
        onViewClose: function () {
            close();
        },
        error: ko.observable(false),
        init: function () {
            popupViewModel.error(false);
            popupViewModel.currentItem({});
        }
    }

    var populateViewModel = function (esData, dataContext) {
        popupViewModel.init();
        //-- if there is a collection just copy the data context items over to our viewmodel
        if (dataContext && dataContext.currentItem) {
            rin.util.overrideProperties(dataContext, popupViewModel);
        }
        else if (dataContext && dataContext.title) {
            popupViewModel.currentItem(dataContext);
        }
        //--the current esData
        popupViewModel.esData = esData;
        subscription = popupViewModel.currentItem.subscribe(onCurrentItemChange);
    }

    var updateView = function () {
        //Once html, javascript and viewmodel is loaded
        //create and load the view and show the experiencestream
        if (_isHtmlLoaded && _isJsLoaded && popupViewModel.esData) {
            var playerControl = $(self._orchestrator.getPlayerRootControl());

            if (self._userInterfaceControl === undefined) {
                self._userInterfaceControl = rin.util.createElementWithHtml(self._elementHtml).firstChild;
                playerControl.append(self._userInterfaceControl);
            }

            //--loads the popup and shows the new ES
            if (self._popupControl === undefined) {
                //-- clones the play pause controls, right side fb/volume controls from player and shows it up
                self._popupControl = new rin.PopupControl.View(self._userInterfaceControl, playerControl.width(), playerControl.height());

                ko.applyBindings(popupViewModel, self._userInterfaceControl);
                self._popupControl.showES(getPlayerControl(), null);
                //self._popupControl.showES(getESControl(), getInteractionControl());
            }
            else {
                //--Hides the old ES and shows the new one
                self._popupControl.hideES(function () {
                    self._popupControl.showES(getPlayerControl(), null);
                    //self._popupControl.showES(getESControl(), getInteractionControl());
                });
            }
        }
    }

    //    var getESControl = function () {
    //        //--create a new orchestrator for the proxy to avoid passing on events to the main player.
    //        var esData = popupViewModel.esData;
    //        var proxy = new rin.internal.OrchestratorProxy(self._orchestrator);
    //        proxy.onESEvent = function () { };

    //        //-- unload existing ES and load the new one
    //        unloadCurrentES();

    //        //--create the new ES, load it and get the UI control of the ES
    //        self._experienceStream = self._orchestrator.createExperienceStream(
    //            esData.providerId,
    //            esData, proxy);

    //        loadCurrentES();
    //        var esControl = self._experienceStream.getUserInterfaceControl();
    //        if (esControl && esControl.setAttribute) { esControl.setAttribute("ES_ID", esData.id); }
    //        return esControl;
    //    }

    var getPlayerControl = function () {
        var narrativeData = popupViewModel.esData;
        var playerElement = rin.util.createElementWithHtml("<div style='width:100%;height:100%'></div>");
        var configuration = new rin.PlayerConfiguration();
        configuration.hideAllControllers = false;
        configuration.controls = true;
        if (typeof popupViewModel.currentItem.rootUrl === "string")
            configuration.rootUrl = popupViewModel.currentItem.rootUrl;
        var playerControl = rin.createPlayerControl(playerElement.firstChild, configuration);
        playerControl.loadData(narrativeData, function () {
            playerControl.play();
        });

        return playerElement.firstChild;
    }

    //    var getInteractionControl = function () {
    //        //call getInteractionControlsForPopup method (incase of video/audio ES) and 
    //        //getInteractionControls for other Experiences
    //        if (typeof self._experienceStream.getInteractionControlsForPopup === 'function') {
    //            return self._experienceStream.getInteractionControlsForPopup();
    //        }
    //        else if (typeof self._experienceStream.getInteractionControls === 'function') {
    //            return self._experienceStream.getInteractionControls();
    //        }
    //        return null;
    //    }
};﻿/// <reference path="../../../web/js/jquery-1.7.2-dev.js" />
/// <reference path="../contracts/IExperienceStream.js" />

rin.ext.registerFactory(rin.contracts.systemFactoryTypes.interactionControlFactory, rin.contracts.interactionControlNames.panZoomControl,
    function (resourcesResolver, loadedCallback) {
        $.get(resourcesResolver.resolveSystemResource("interactionControls/PanZoomControls.html"), null, function (visual) {
            var wrap = document.createElement("div"),
                systemRoot = resourcesResolver.getSystemRootUrl();
            wrap.style["display"] = "inline-block";
            rin.util.assignAsInnerHTMLUnsafe(wrap, visual.replace(/SYSTEM_ROOT/g, systemRoot));
            loadedCallback(wrap);
        });
    });

rin.ext.registerFactory(rin.contracts.systemFactoryTypes.interactionControlFactory, rin.contracts.interactionControlNames.mediaControl,
    function (resourcesResolver, loadedCallback) {
        $.get(resourcesResolver.resolveSystemResource("interactionControls/MediaControls.html"), null, function (visual) {
            var wrap = document.createElement("div"),
                systemRoot = resourcesResolver.getSystemRootUrl();
            rin.util.assignAsInnerHTMLUnsafe(wrap, visual.replace(/SYSTEM_ROOT/g, systemRoot))
            loadedCallback(wrap);
        });
    });

rin.ext.registerFactory(rin.contracts.systemFactoryTypes.interactionControlFactory, "MicrosoftResearch.Rin.InteractionControls.RotateControl",
   function (resourcesResolver, loadedCallback) {
       $.get(resourcesResolver.resolveSystemResource("interactionControls/RotateControl.html"), null, function (visual) {
           var wrap = document.createElement("div"),
               systemRoot = resourcesResolver.getSystemRootUrl();
           wrap.style["display"] = "inline-block";
           rin.util.assignAsInnerHTMLUnsafe(wrap, visual.replace(/SYSTEM_ROOT/g, systemRoot))
           loadedCallback(wrap);
       });
   });
﻿/// <reference path="../contracts/IExperienceStream.js" />

(function (rin) {
    // Behavior for expanding a overlay to fullscreen.
    var PopupBehavior = function (orchestrator) {
        this.orchestrator = orchestrator;

        // Execute this behavior on the assigned target.
        this.executeBehavior = function (behaviorArgs, completionCallback) {
            var dataContext = behaviorArgs.DataContext;
            this.getItemESData(dataContext);
            var popup = new rin.PopupControl(this.orchestrator);
            popup.load(dataContext.esData, dataContext);

            $(popup).bind('onclose', function (e) {
                if (typeof (completionCallback) === 'function')
                    completionCallback();
            });
        };

        this.getItemESData = function (itemData) {
            if (itemData.esData === undefined) {
                itemData.esData = rin.internal.esDataGenerator.getExperienceStream(itemData);
            }
        };
    };

    rin.ext.registerFactory(rin.contracts.systemFactoryTypes.behaviorFactory, "MicrosoftResearch.Rin.Behaviors.Popup",
        function (orchestrator) {
            return new PopupBehavior(orchestrator);
        });
})(window.rin);﻿jQuery.fn.extend({
    rinTouchGestures: function (callback, options) {
        var swipeMinDistance = 20,
            swipeMaxDistance = $(window).width() * 0.8,
            swipeMinDelay = 50,
            swipeMaxDelay = 1000,
            doubleTapMinDelay = 50,
            doubleTapMaxDelay = 1000,
            longTapDelay = 1000;

        var captureGestures = {
            preventDefaults: true,
            swipe: true,
            doubleTap: false,
            longTap: false,
            simpleTap: false
        };

        options = options || captureGestures;

        for (var key in captureGestures) {
            if (typeof options[key] == "undefined") options[key] = captureGestures[key];
        }

        return this.each(function () {

            var gestureStartTime = null,
            lastTap = 0,
            longTapTimer = null,
            asLongTap = false;

            var startCoords = { x: 0, y: 0 };
            var endCoords = { x: 0, y: 0 };

            $(this).bind("touchstart mousedown", onGestureStart);

            if (options.swipe)
                $(this).bind("touchmove mousemove", onGestureMove);

            $(this).bind("touchend mouseup", onGestureEnd);

            function onGestureStart(e) {
                if (options.longTap) {
                    window.clearTimeout(longTapTimer);
                    asLongTap = false;
                    longTapTimer = window.setTimeout(
                        function () {
                            longTapEvent(e)
                        }
                        , longTapDelay);
                }

                gestureStartTime = (new Date).getTime();
                getCoordinates(startCoords, e);
                endCoords.x = 0;
                endCoords.y = 0;
            }

            function longTapEvent(e) {
                asLongTap = true;
                lastTap = 0;
                return callback.call(this, e, { gesture: 'longtap' });
            }

            function onSimpleTap(e) {
                if (options.longTap) {
                    window.clearTimeout(longTapTimer);
                }
                return callback.call(this, e, { gesture: 'simpletap' });
            }

            function onGestureMove(e) {
                if (options.preventDefaults) {
                    e.preventDefault();
                }
                if (options.longTap) {
                    window.clearTimeout(longTapTimer);
                }
                getCoordinates(endCoords, e);
            }

            function onGestureEnd(e) {
                var now = (new Date).getTime();

                if (options.preventDefaults) {
                    e.preventDefault();
                }
                if (options.longTap) {
                    window.clearTimeout(longTapTimer);
                    if (asLongTap) {
                        return false;
                    }
                }


                if (options.doubleTap) {
                    var delay = now - lastTap;
                    lastTap = now;
                    if ((delay > doubleTapMinDelay) && (delay < doubleTapMaxDelay)) {
                        lastTap = 0;
                        return callback.call(this, e, { gesture: 'doubletap', delay: delay });
                    }
                }

                if (options.swipe) {
                    var coords = {};
                    coords.delay = now - gestureStartTime;
                    coords.deltaX = endCoords.x - startCoords.x;
                    coords.deltaY = startCoords.y - endCoords.y;

                    absX = Math.abs(coords.deltaX);
                    absY = Math.abs(coords.deltaY);

                    coords.distance = (absX < absY) ? absY : absX;
                    coords.direction = (absX < absY) ? ((coords.deltaY < 0) ? 'down' : 'up') : (((coords.deltaX < 0) ? 'left' : 'right'));

                    if (endCoords.x != 0
                        && (coords.distance > swipeMinDistance)
                        && (coords.distance < swipeMaxDistance)
                        && (coords.delay > swipeMinDelay)
                        && (coords.delay < swipeMaxDelay)
                        ) {
                        lastTap = 0;
                        coords.gesture = 'swipe';
                        return callback.call(this, e, coords);
                    }
                }

                if (options.simpleTap)
                    onSimpleTap(e);
            }

            function getCoordinates(coords, e) {
                if (e.originalEvent !== undefined && e.originalEvent.targetTouches !== undefined && e.originalEvent.targetTouches.length > 0) {
                    coords.x = e.originalEvent.targetTouches[0].clientX;
                    coords.y = e.originalEvent.targetTouches[0].clientY;
                }
                else {
                    coords.x = e.clientX;
                    coords.y = e.clientY;
                }
            }
        });
    }
});
﻿window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

//--Loads a JSON collection
rin.internal.JSONLoader = {
    loadJSON: function (jsonUrl, onsuccess, onerror) {
        var options = {
            url: jsonUrl,
            dataType: "json",
            error: function (jqxhr, textStatus, errorThrown) {
                onerror(errorThrown, jsonUrl);
            },
            success: function (data, textStatus, jqxhr) {
                onsuccess(data, jsonUrl);
            }
        };
        $.ajax(options);
    },
    //--Processes a JSON Collection, by creating lists for binding from the group/item dictionaries
    processCollectionJSON: function (jsonUrl, collectionData, resourceResolver) {
        //--properties to look out for to call resolveResourceReference on
        var properties = new rin.internal.List("thumbnailMedia", "src", "largeMedia", "smallMedia");
        collectionData.groupsList = rin.util.getDictionaryValues(collectionData.layout.groups);

        var lastSlashPos = jsonUrl.lastIndexOf("/");
        var rootUrl = jsonUrl.substr(0, lastSlashPos);

        var groupIndex = 0;
        collectionData.groupsList.foreach(function (group) {
            group.itemsList = rin.util.getDictionaryValues(group.items);
            group.itemsList.foreach(function (item) {
                properties.foreach(function (property) {
                    //--resolve resource reference
                    if (item.hasOwnProperty(property) && item[property].lastIndexOf("http", 0) !== 0) {
                        item[property] = rin.util.combinePathElements(rootUrl, item[property]);
                    }
                });
                item.groupIndex = groupIndex;
            });
            groupIndex++;
        });

        for (var itemId in collectionData.items) {
            var item = collectionData.items[itemId];
            properties.foreach(function (property) {
                //--resolve resource reference
                if (item.hasOwnProperty(property) && item[property].lastIndexOf("http", 0) !== 0) {
                    item[property] = rin.util.combinePathElements(rootUrl, item[property]);
                }
            });
        }

        return collectionData;
    }
};﻿/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Generates a narrative dynamically on the fly, 
* using a JSON object as datacontext
* Constraints: The following fields are expected in the json datacontext.
* 1. Estimated duration [duration or largeMediaDuration] of the narrative or the ES(in case of video, audio or a rin).
* 2. Any new ES providers not part of the current rin project has to be specified in [srcType]
* 3. Default aspect ratio is set to Widescreem, if there is a need for a differen one specify it in [aspectRatio]
* 4. If the Experiencestream has to have any keyframes, specify it in [keyframes]
* 5. If the resource urls [src] are relative urls, remember to specify the rootUrl in [rootUrl]
* 6. Multiple resource urls if required by the ES cannot be provided as of now. Capability to be added if necessary.
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

rin.internal.esDataGenerator = {
    _narrativeData: {
        "version": 1.0,
        "defaultScreenplayId": "SCP1",
        "screenplayProviderId": "MicrosoftResearch.Rin.DefaultScreenPlayInterpreter",
        "data": {
            "narrativeData": {
                "guid": "6aa09d19-cf2b-4c8e-8b57-7ea8701794f7",
                "aspectRatio": "$ASPECTRATIO$",
                "estimatedDuration": "$DURATION$",
                "branding": null
            }
        },
        "providers": {
            "$ESPROVIDER$": {
                "name": "$ESPROVIDER$",
                "version": 0.0
            },
            "MicrosoftResearch.Rin.DefaultScreenPlayInterpreter": {
                "name": "MicrosoftResearch.Rin.DefaultScreenPlayInterpreter",
                "version": 0.0
            }
        },
        "resources": {
            "R-1": {
                "uriReference": "$RESOURCEREF$"
            }
        },
        "experiences": {
            "$ESID$": {
                "providerId": "$ESPROVIDER$",
                "data": {},
                "resourceReferences": [
                        {
                            "resourceId": "R-1",
                            "required": true
                        }
                    ],
                "experienceStreams": {
                    "defaultStream": {
                        "duration": "0",
                        "data": {
                            "ContentType": "<$CONTENTTYPE$/>"
                        },
                        "keyframes": ["$KEYFRAMES$"]
                    }
                }
            }
        },
        "screenplays": {
            "SCP1": {
                "data": {
                    "experienceStreamReferences": [
					{
					    "experienceId": "$ESID$",
					    "experienceStreamId": "defaultStream",
					    "begin": "0",
					    "duration": "0",
					    "layer": "foreground",
					    "dominantMedia": "visual",
					    "volume": 1
					}]
                }
            }
        }
    },
    //    _esJSONData: {
    //        "$ESID$": {
    //            "providerId": "$ESPROVIDER$",
    //            "data": {},
    //            "resourceReferences": [
    //                {
    //                    "resourceId": "R-1",
    //                    "required": true
    //                }
    //            ],
    //            "experienceStreams": {
    //                "defaultStream": {
    //                    "duration": "0",
    //                    "data": {
    //                        "ContentType": "<$CONTENTTYPE$/>"
    //                    },
    //                    "keyframes": ["$KEYFRAMES$"]
    //                }
    //            }
    //        }
    //    },
    esSrcTypeToProviderDictionary: {
        "singledeepzoomimage": "MicrosoftResearch.Rin.ZoomableMediaExperienceStream",
        "deepzoomimage": "MicrosoftResearch.Rin.ZoomableMediaExperienceStream",
        "zoomableimage": "MicrosoftResearch.Rin.ZoomableMediaExperienceStream",
        "zoomablevideo": "MicrosoftResearch.Rin.ZoomableMediaExperienceStream",
        "zoomablemediacollection": "MicrosoftResearch.Rin.ZoomableMediaExperienceStream",
        "video": "MicrosoftResearch.Rin.VideoExperienceStream",
        "audio": "MicrosoftResearch.Rin.AudioExperienceStream",
        "pivot": "MicrosoftResearch.Rin.PivotExperienceStream",
        "xps": "MicrosoftResearch.Rin.DocumentViewerExperienceStream",
        "photosynth": "MicrosoftResearch.Rin.PhotosynthES",
        "collection": "MicrosoftResearch.Rin.RinTemplates.$THEME$TwoDTemplateES",
        "collectiononed": "MicrosoftResearch.Rin.RinTemplates.$THEME$OneDTemplateES",
        "wall": "MicrosoftResearch.Rin.WallExperienceStream",
        "map": "MicrosoftResearch.Rin.MapExperienceStream"
    },
    getExperienceStream: function (context, themeName) {
        if (context === undefined)
            return;
        var esData = JSON.stringify(this._narrativeData);
        var providerName = this.esSrcTypeToProviderDictionary[context.srcType.toLowerCase()] || context.srcType;
        var keyframeData = context.keyframes || "";
        var aspectratio = "WideScreen";
        var duration = context.duration || context.largeMediaDuration || "100";
        if (themeName) { providerName = providerName.replace("$THEME$", themeName); }

        var esId = context.id || Math.floor(Math.random() * 1000).toString() + "_Popup_ES";

        esData = this.replaceAll('$ESID$', esId, esData);
        esData = this.replaceAll("$ESPROVIDER$", providerName, esData);
        esData = esData.replace('$RESOURCEREF$', context.src)
                       .replace('$CONTENTTYPE$', context.srcType)
                       .replace('$ASPECTRATIO$', context.aspectRatio || aspectratio)
                       .replace('$DURATION$', duration)
                       .replace("$KEYFRAMES$", keyframeData);
        var esDataJSON = rin.util.parseJSON(esData);
        esDataJSON.id = esId;

        return esDataJSON;
    },

    replaceAll: function (find, replace, str) {
        return str.split(find).join(replace);
    }
};


﻿/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../../../web/js/knockout-2.1.0.debug.js">
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="../core/Common.js">
/// <reference path="../core/Orchestrator.js">

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

rin.internal.SelfTester = function (orchestrator) {
    "use strict";

    var self = this,
        timer = new rin.internal.Timer(),
        getNextInterval = function () {
            return rin.util.randInt(self.minimumTimeInterval, self.maximumTimeInterval);
        },
        narrativeDuration = 0,
        initialize = function () {
            self.minimumTimeInterval = self.minimumTimeInterval || 1;
            self.maximumTimeInterval = self.maximumTimeInterval || (orchestrator && orchestrator.getNarrativeInfo() && orchestrator.getNarrativeInfo().totalDuration) || 3;
            narrativeDuration = orchestrator.getNarrativeInfo().totalDuration;
        },
        doOperation = function () {
            var opCode = Math.floor(rin.util.randInt(0, 6)),
                currrentTimeOffset = orchestrator.getCurrentLogicalTimeOffset(),
                esWithInteractionControls,
                nextOffset;
            switch (opCode) {
                case 0:
                case 1:
                case 2:
                    if (orchestrator.getPlayerState() === rin.contracts.playerState.playing) {
                        orchestrator.pause();
                        orchestrator.eventLogger.logEvent(">>> Self Tester issues a pause at " + currrentTimeOffset);
                    } else if (orchestrator.getPlayerState() === rin.contracts.playerState.pausedForExplore) {
                        orchestrator.play();
                        orchestrator.eventLogger.logEvent(">>> Self Tester issues a play at " + currrentTimeOffset);
                    }
                    break;
                case 3:
                case 4:
                    nextOffset = rin.util.rand(0, narrativeDuration);
                    orchestrator.play(nextOffset);
                    break;
                case 5:
                    esWithInteractionControls = orchestrator.getCurrentESItems().firstOrDefault(function (item) {
                        return typeof item.experienceStream.getInteractionControls === 'function';
                    });
                    if (esWithInteractionControls) {
                        orchestrator.onESEvent(esWithInteractionControls.experienceStream, rin.contracts.esEventIds.interactionActivatedEventId, null);
                        self.interactionEvent.publish();
                    }
                    break;
            }
        };

    timer.tick = function () {
        doOperation();
        timer.intervalSeconds = getNextInterval();
    };

    this.interactionEvent = new rin.contracts.Event();
    this.minimumTimeInterval = 0;
    this.maximumTimeInterval = 0;

    this.startSelfTest = function () {
        initialize();
        timer.intervalSeconds = getNextInterval();
        timer.start();
    };
    this.stopSelfTest = function () {
        timer.stop();
    };    
};