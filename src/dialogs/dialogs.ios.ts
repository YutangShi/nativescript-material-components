import { themer } from 'nativescript-material-core/core';
import { TextField } from 'nativescript-material-textfield';
import { getRootView } from 'tns-core-modules/application';
import { fromObject } from 'tns-core-modules/data/observable/observable';
import { createViewFromEntry } from 'tns-core-modules/ui/builder/builder';
import { ios as iosView, View } from 'tns-core-modules/ui/core/view/view';
import { layout } from 'tns-core-modules/utils/utils';
import {
    ActionOptions,
    ALERT,
    CANCEL,
    capitalizationType,
    CONFIRM,
    ConfirmOptions,
    DialogOptions,
    getButtonColors,
    getCurrentPage,
    getLabelColor,
    getTextFieldColor,
    inputType,
    LOGIN,
    LoginResult,
    OK,
    PROMPT,
    PromptResult
} from 'tns-core-modules/ui/dialogs';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout/stack-layout';
import { isDefined, isFunction, isString } from 'tns-core-modules/utils/types';
import { LoginOptions, MDCAlertControlerOptions, PromptOptions } from './dialogs';
import { isDialogOptions } from './dialogs-common';

const UNSPECIFIED = layout.makeMeasureSpec(0, layout.UNSPECIFIED);

class MDCDialogPresentationControllerDelegateImpl extends NSObject implements MDCDialogPresentationControllerDelegate {
    public static ObjCProtocols = [MDCDialogPresentationControllerDelegate];

    private _callback: Function;

    public static initWithCallback(callback: Function): MDCDialogPresentationControllerDelegateImpl {
        const impl = <MDCDialogPresentationControllerDelegateImpl>MDCDialogPresentationControllerDelegateImpl.new();
        impl._callback = callback;
        return impl;
    }
    dialogPresentationControllerDidDismiss(controller: MDCDialogPresentationController) {
        const callback = this._callback;
        if (callback) {
            callback();
        }
    }
}

interface MDCAlertControllerImpl extends MDCAlertController {
    // new (): MDCAlertControllerImpl;
    autoFocusTextField?: TextField;
    customContentView?: View;
    _customContentViewContext?: any;
    _resolveFunction?: Function;
    actions: NSArray<any>;
}
const MDCAlertControllerImpl: MDCAlertControllerImpl = (MDCAlertController as any).extend(
    {
        get preferredContentSize() {
            const superResult = this.super.preferredContentSize;
            const measuredHeight = this._customContentView ? this._customContentView.getMeasuredHeight() : 0; // pixels
            const hasTitleOrMessage = this.title || this.message;
            let result: CGSize;
            if (hasTitleOrMessage) {
                result = CGSizeMake(superResult.width, superResult.height + layout.toDeviceIndependentPixels(measuredHeight));
            } else if (this.actions.count > 0) {
                result = CGSizeMake(superResult.width, layout.toDeviceIndependentPixels(superResult.height) + layout.toDeviceIndependentPixels(measuredHeight));
            } else {
                result = CGSizeMake(superResult.width, layout.toDeviceIndependentPixels(measuredHeight));
            }
            return result;
        },
        set preferredContentSize(x) {
            this.super.preferredContentSize = x;
        },
        get contentScrollView() {
            const alertView = this.super.view as MDCAlertControllerView;
            if (alertView) {
                const contentScrollView = alertView.subviews[0] as UIScrollView;
                return contentScrollView;
            }
            return null;
        },

        addCustomViewToLayout() {
            const contentScrollView = this.contentScrollView as UIView;
            const view = this._customContentView;
            view._setupAsRootView({});
            view._isAddedToNativeVisualTree = true;
            view.callLoaded();
            if (this._customContentViewContext) {
                view.bindingContext = fromObject(this._customContentViewContext);
                this._customContentViewContext = null;
            }
            const nativeViewProtected = this._customContentView.nativeViewProtected;
            if (contentScrollView && nativeViewProtected) {
                contentScrollView.addSubview(nativeViewProtected);
                this.layoutViews(); // ensure custom view is measured for preferredContentSize
            }
        },
        get customContentView() {
            return this._customContentView;
        },
        set customContentView(view: View) {
            this._customContentView = view;
            if (view) {
                view.viewController = this;
                if (this.viewLoaded) {
                    this.addCustomViewToLayout();
                }
            }
        },
        measureChild() {
            const contentSize = this.contentScrollView.contentSize;
            const width = contentSize.width || this.super.preferredContentSize.width;
            const widthSpec = layout.makeMeasureSpec(layout.toDevicePixels(width), layout.EXACTLY);
            View.measureChild(null, this._customContentView, widthSpec, UNSPECIFIED);
        },
        layoutViews() {
            if (this._customContentView) {
                const view = this._customContentView as View;
                const hasTitleOrMessage = this.title || this.message;
                const contentScrollView = this.contentScrollView as UIScrollView;
                contentScrollView.clipsToBounds = true;
                const contentSize = contentScrollView.contentSize;
                const originY = hasTitleOrMessage ? layout.toDevicePixels(contentSize.height) : 0;

                this.measureChild();
                const measuredHeight = view.getMeasuredHeight(); // pixels
                const measuredWidth = view.getMeasuredWidth(); // pixels
                View.layoutChild(null, view, 0, originY, measuredWidth, originY + measuredHeight);

                const bounds = contentScrollView.frame;
                const boundsSize = bounds.size;
                contentSize.height = contentSize.height + layout.toDeviceIndependentPixels(measuredHeight);
                boundsSize.height = boundsSize.height + layout.toDeviceIndependentPixels(measuredHeight);

                contentScrollView.contentSize = contentSize;
                bounds.size = boundsSize;
                contentScrollView.frame = bounds;
                // TODO: for a reload of the preferredContentSize. Find a better solution!
                this.preferredContentSize = CGSizeMake(this.super.preferredContentSize.width, this.super.preferredContentSize.height + 0.0000000001);
            }
        },
        viewDidLayoutSubviews() {
            if (this._customContentView) {
                this.layoutViews();
            }
            this.super.viewDidLayoutSubviews();
            if (this.autoFocusTextField) {
                this.autoFocusTextField.requestFocus();
                this.autoFocusTextField = null;
            }
        },
        viewDidLoad() {
            this.super.viewDidLoad();
            if (this._customContentView) {
                this.addCustomViewToLayout();
            }
        },
        viewDidUnload() {
            this.super.viewDidUnload();
            if (this.customContentView) {
                this._customContentView.callUnloaded();
                this._customContentView._tearDownUI(true);
                this._customContentView._isAddedToNativeVisualTree = false;
                this._customContentView = null;
            }
        }
    },
    {
        name: 'MDCAlertControllerImpl'
    }
);

function addButtonsToAlertController(alertController: MDCAlertController, options: ConfirmOptions, callback?: Function, validation?: Function): void {
    if (!options) {
        return;
    }

    if (isString(options.cancelButtonText)) {
        alertController.addAction(
            MDCAlertAction.actionWithTitleEmphasisHandler(options.cancelButtonText, MDCActionEmphasis.Low, () => {
                raiseCallback(callback, false);
            })
        );
    }

    if (isString(options.neutralButtonText)) {
        alertController.addAction(
            MDCAlertAction.actionWithTitleEmphasisHandler(options.neutralButtonText, MDCActionEmphasis.Low, () => {
                raiseCallback(callback, undefined);
            })
        );
    }

    if (isString(options.okButtonText)) {
        alertController.addAction(
            MDCAlertAction.actionWithTitleEmphasisHandler(options.okButtonText, MDCActionEmphasis.Low, () => {
                if (validation && !validation(options)) {
                    return;
                }
                raiseCallback(callback, true);
            })
        );
    }
}

function raiseCallback(callback, result) {
    if (isFunction(callback)) {
        callback(result);
    }
}

function createAlertController(options: DialogOptions & MDCAlertControlerOptions, resolve?: Function) {
    const alertController = (MDCAlertControllerImpl as any).new() as MDCAlertControllerImpl;
    const buttonColor = getButtonColors().color;
    if (buttonColor) {
        alertController.view.tintColor = buttonColor.ios;
    }
    const lblColor = getLabelColor();

    if (options.title) {
        alertController.title = options.title;
    }
    if (options.message) {
        alertController.message = options.message;
    }
    if (options.buttonFont) {
        alertController.buttonFont = options.buttonFont.getUIFont(alertController.buttonFont);
    }
    if (options.messageFont) {
        alertController.messageFont = options.messageFont.getUIFont(alertController.messageFont);
    }
    if (options.titleFont) {
        alertController.titleFont = options.titleFont.getUIFont(alertController.titleFont);
    }
    if (options.buttonInkColor) {
        alertController.buttonInkColor = options.buttonInkColor.ios;
    }
    if (options.buttonTitleColor) {
        alertController.buttonTitleColor = options.buttonTitleColor.ios;
    }
    if (options.scrimColor) {
        alertController.scrimColor = options.scrimColor.ios;
    }
    if (options.titleColor) {
        alertController.titleColor = options.titleColor.ios;
    } else if (lblColor) {
        alertController.titleColor = lblColor.ios;
    }
    if (options.titleIconTintColor) {
        alertController.titleIconTintColor = options.titleIconTintColor.ios;
    }
    if (options.messageColor) {
        alertController.messageColor = options.messageColor.ios;
    } else if (lblColor) {
        alertController.messageColor = lblColor.ios;
    }
    if (options.elevation) {
        alertController.elevation = options.elevation;
    }
    if (options.cornerRadius) {
        alertController.cornerRadius = options.cornerRadius;
    } else {
        alertController.cornerRadius = 2;
    }
    if (options.titleIcon) {
        alertController.titleIcon = options.titleIcon.ios;
    }
    if (options.titleAlignment) {
        switch (options.titleAlignment) {
            case 'initial':
            case 'left':
                alertController.titleAlignment = NSTextAlignment.Left;
                break;
            case 'center':
                alertController.titleAlignment = NSTextAlignment.Center;
                break;
            case 'right':
                alertController.titleAlignment = NSTextAlignment.Right;
                break;
        }
    }

    if (options.view) {
        const view =
            options.view instanceof View
                ? (options.view as View)
                : createViewFromEntry({
                      moduleName: options.view as string
                  });
        alertController.customContentView = view;
        alertController._resolveFunction = resolve;
        const context = options.context || {};
        context.closeCallback = function(...originalArgs) {
            alertController.dismissModalViewControllerAnimated(true);
            if (alertController._resolveFunction && resolve) {
                alertController._resolveFunction = null;
                resolve.apply(this, originalArgs);
            }
        };
        alertController._customContentViewContext = context;
        // view.bindingContext = fromObject(context);
    }

    alertController.mdc_dialogPresentationController.dialogPresentationControllerDelegate = MDCDialogPresentationControllerDelegateImpl.initWithCallback(() => {
        resolve();
        alertController._resolveFunction = null;
        alertController.mdc_dialogPresentationController.delegate = null;
    });

    if (options && options.cancelable === false) {
        alertController.mdc_dialogPresentationController.dismissOnBackgroundTap = false;
    }

    // const transitionController = MDCDialogTransitionController.alloc().init()
    // alertController.modalPresentationStyle = UIModalPresentationStyle.Custom;
    // alertController.transitioningDelegate = transitionController;
    return alertController;
}

export function alert(arg: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const defaultOptions = {
                // title: ALERT,
                okButtonText: OK
            };
            const options = !isDialogOptions(arg) ? Object.assign(defaultOptions, { message: arg + '' }) : Object.assign(defaultOptions, arg);
            const alertController = createAlertController(options, resolve);

            addButtonsToAlertController(alertController, options, result => {
                alertController._resolveFunction = null;
                resolve(result);
            });

            showUIAlertController(alertController);
        } catch (ex) {
            reject(ex);
        }
    });
}

export class AlertDialog {
    alertController: MDCAlertController;
    constructor(private options: any) {}
    show() {
        if (!this.alertController) {
            this.alertController = createAlertController(this.options);

            // addButtonsToAlertController(this.alertController, options, result => {
            //     (this.alertController as any)._resolveFunction = null;
            //     resolve(result);
            // });

            showUIAlertController(this.alertController);
        }
    }
    hide() {
        if (this.alertController) {
            this.alertController.dismissModalViewControllerAnimated(true);
            this.alertController = null;
        }
    }
}

export function confirm(arg: any): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            const defaultOptions = {
                // title: CONFIRM,
                okButtonText: OK,
                cancelButtonText: CANCEL
            };
            const options = !isDialogOptions(arg)
                ? Object.assign(defaultOptions, {
                      message: arg + ''
                  })
                : Object.assign(defaultOptions, arg);
            const alertController = createAlertController(options, resolve);

            addButtonsToAlertController(alertController, options, r => {
                resolve(r);
            });

            showUIAlertController(alertController);
        } catch (ex) {
            reject(ex);
        }
    });
}

export function prompt(arg: any): Promise<PromptResult> {
    let options: PromptOptions & MDCAlertControlerOptions;

    const defaultOptions = {
        // title: PROMPT,
        okButtonText: OK,
        cancelButtonText: CANCEL,
        inputType: inputType.text
    };

    if (arguments.length === 1) {
        if (isString(arg)) {
            options = defaultOptions;
            options.message = arg;
        } else {
            options = Object.assign(defaultOptions, arg);
        }
    } else if (arguments.length === 2) {
        if (isString(arguments[0]) && isString(arguments[1])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.defaultText = arguments[1];
        }
    }

    return new Promise<PromptResult>((resolve, reject) => {
        try {
            // let textField: MDCTextField;

            const stackLayout = new StackLayout();
            stackLayout.padding = 4;
            const textField = new TextField();
            textField.hint = options.hintText;
            if (options) {
                if (options.textFieldProperties) {
                    Object.assign(textField, options.textFieldProperties);
                }
                if (options.defaultText) {
                    textField.text = options.defaultText;
                }
                if (options.defaultText) {
                    textField.hint = options.hintText;
                }
                if (options.helperText) {
                    textField.helper = options.helperText;
                }
                if (options.inputType === inputType.password) {
                    textField.secure = true;
                    // textField.keyboardType = 'text';
                    // input.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
                } else if (options.inputType === inputType.email) {
                    textField.keyboardType = 'email';
                    // input.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
                } else if (options.inputType === inputType.number) {
                    textField.keyboardType = 'number';
                    // input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
                } else if (options.inputType === inputType.phone) {
                    textField.keyboardType = 'phone';
                    //   input.setInputType(android.text.InputType.TYPE_CLASS_PHONE);
                }

                switch (options.capitalizationType) {
                    case capitalizationType.all: {
                        textField.autocapitalizationType = 'allcharacters';
                        break;
                    }
                    case capitalizationType.sentences: {
                        textField.autocapitalizationType = 'sentences';
                        // input.setInputType(input.getInputType() | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
                        break;
                    }
                    case capitalizationType.words: {
                        textField.autocapitalizationType = 'words';
                        // input.setInputType(input.getInputType() | android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS);
                        break;
                    }
                }
            }
            stackLayout.addChild(textField);
            options.view = stackLayout;

            const alertController = createAlertController(options, resolve);
            addButtonsToAlertController(alertController, options, r => {
                alertController._resolveFunction = null;
                resolve({ result: r, text: textField.text });
            });
            if (!!options.autoFocus) {
                alertController.autoFocusTextField = textField;
                // textField.requestFocus();
            }
            showUIAlertController(alertController);
        } catch (ex) {
            reject(ex);
        }
    });
}

export function login(arg: any): Promise<LoginResult> {
    let options: LoginOptions & MDCAlertControlerOptions;

    const defaultOptions = {
        // title: LOGIN,
        okButtonText: OK,
        cancelButtonText: CANCEL
    };

    if (arguments.length === 1) {
        if (isString(arguments[0])) {
            options = defaultOptions;
            options.message = arguments[0];
        } else {
            options = Object.assign(defaultOptions, arguments[0]);
        }
    } else if (arguments.length === 2) {
        if (isString(arguments[0]) && isString(arguments[1])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.userName = arguments[1];
        }
    } else if (arguments.length === 3) {
        if (isString(arguments[0]) && isString(arguments[1]) && isString(arguments[2])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.userName = arguments[1];
            options.password = arguments[2];
        }
    }

    return new Promise<LoginResult>((resolve, reject) => {
        try {
            const stackLayout = new StackLayout();
            stackLayout.padding = 4;
            const userNameTextField = new TextField();
            const passwordTextField = new TextField();
            userNameTextField.hint = options.userNameHint || 'Username';
            userNameTextField.text = options.userName;
            passwordTextField.hint = options.passwordHint || 'Password';
            passwordTextField.text = options.password;
            passwordTextField.secure = true;

            if (options.usernameTextFieldProperties) {
                Object.assign(userNameTextField, options.usernameTextFieldProperties);
            }
            if (options.passwordTextFieldProperties) {
                Object.assign(passwordTextField, options.passwordTextFieldProperties);
            }

            stackLayout.addChild(userNameTextField);
            stackLayout.addChild(passwordTextField);
            options.view = stackLayout;
            const alertController = createAlertController(options, resolve);

            // const textFieldColor = getTextFieldColor();

            // alertController.addTextFieldWithConfigurationHandler(
            //     (arg: UITextField) => {
            //         arg.placeholder = "Login"
            //         arg.text = isString(options.userName)
            //             ? options.userName
            //             : ""

            //         if (textFieldColor) {
            //             arg.textColor = arg.tintColor = textFieldColor.ios
            //         }
            //     }
            // )

            // alertController.addTextFieldWithConfigurationHandler(
            //     (arg: UITextField) => {
            //         arg.placeholder = "Password"
            //         arg.secureTextEntry = true
            //         arg.text = isString(options.password)
            //             ? options.password
            //             : ""

            //         if (textFieldColor) {
            //             arg.textColor = arg.tintColor = textFieldColor.ios
            //         }
            //     }
            // )

            // userNameTextField = alertController.textFields.firstObject
            // passwordTextField = alertController.textFields.lastObject

            addButtonsToAlertController(alertController, options, r => {
                resolve({
                    result: r,
                    userName: userNameTextField.text,
                    password: passwordTextField.text
                });
            });

            if (!!options.beforeShow) {
                options.beforeShow(options, userNameTextField, passwordTextField);
            }
            showUIAlertController(alertController);
            if (!!options.autoFocus) {
                alertController.autoFocusTextField = userNameTextField;
            }
        } catch (ex) {
            reject(ex);
        }
    });
}

function showUIAlertController(alertController: MDCAlertController) {
    // themer needs to be applied after actions creation

    const colorScheme: MDCSemanticColorScheme = themer.getAppColorScheme();
    if (colorScheme) {
        MDCAlertColorThemer.applySemanticColorSchemeToAlertController(colorScheme, alertController);
    } else {
        MDCAlertControllerThemer.applySchemeToAlertController(MDCAlertScheme.alloc().init(), alertController);
    }

    let currentView = getCurrentPage() || getRootView();

    if (currentView) {
        currentView = currentView.modal || currentView;

        let viewController: UIViewController = currentView.ios;

        if (!(currentView.ios instanceof UIViewController)) {
            const parentWithController = iosView.getParentWithViewController(currentView);
            viewController = parentWithController ? parentWithController.viewController : undefined;
        }

        if (viewController) {
            if (alertController.popoverPresentationController) {
                alertController.popoverPresentationController.sourceView = viewController.view;
                alertController.popoverPresentationController.sourceRect = CGRectMake(viewController.view.bounds.size.width / 2.0, viewController.view.bounds.size.height / 2.0, 1.0, 1.0);
                alertController.popoverPresentationController.permittedArrowDirections = 0;
            }

            viewController.presentModalViewControllerAnimated(alertController, true);
        }
    }
}

export function action(): Promise<string> {
    let options: ActionOptions;

    const defaultOptions = {
        // title: null,
        cancelButtonText: CANCEL
    };

    if (arguments.length === 1) {
        if (isString(arguments[0])) {
            options = defaultOptions;
            options.message = arguments[0];
        } else {
            options = Object.assign(defaultOptions, arguments[0]);
        }
    } else if (arguments.length === 2) {
        if (isString(arguments[0]) && isString(arguments[1])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.cancelButtonText = arguments[1];
        }
    } else if (arguments.length === 3) {
        if (isString(arguments[0]) && isString(arguments[1]) && isDefined(arguments[2])) {
            options = defaultOptions;
            options.message = arguments[0];
            options.cancelButtonText = arguments[1];
            options.actions = arguments[2];
        }
    }

    return new Promise<string>((resolve, reject) => {
        try {
            let i: number;
            let action: string;
            const alertController = createAlertController(options, resolve);

            if (options.actions) {
                for (i = 0; i < options.actions.length; i++) {
                    action = options.actions[i];
                    if (isString(action)) {
                        alertController.addAction(
                            MDCAlertAction.actionWithTitleEmphasisHandler(action, MDCActionEmphasis.Low, (arg: MDCAlertAction) => {
                                resolve(arg.title);
                            })
                        );
                    }
                }
            }

            if (isString(options.cancelButtonText)) {
                alertController.addAction(
                    MDCAlertAction.actionWithTitleEmphasisHandler(options.cancelButtonText, MDCActionEmphasis.Low, (arg: MDCAlertAction) => {
                        resolve(arg.title);
                    })
                );
            }

            showUIAlertController(alertController);
        } catch (ex) {
            reject(ex);
        }
    });
}
