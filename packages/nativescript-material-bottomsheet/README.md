[![npm](https://img.shields.io/npm/v/nativescript-material-bottomsheet.svg)](https://www.npmjs.com/package/nativescript-material-bottomsheet)
[![npm](https://img.shields.io/npm/dt/nativescript-material-bottomsheet.svg?label=npm%20downloads)](https://www.npmjs.com/package/nativescript-material-bottomsheet)
[![GitHub forks](https://img.shields.io/github/forks/Akylas/nativescript-material-components.svg)](https://github.com/Akylas/nativescript-material-components/network)
[![GitHub stars](https://img.shields.io/github/stars/Akylas/nativescript-material-components.svg)](https://github.com/Akylas/nativescript-material-components/stargazers)

# NativeScript Material BottomSheets

Use the Material Design Bottom Sheets in your {N} app

##### [Material Design Spec](https://material.io/design/components/sheets-bottom.html)

## Installation

`tns plugin add nativescript-material-bottomsheet`

## [Changelog](./CHANGELOG.md)

## Usage

### Start-up wiring (NON ANGULAR)
We need to do some wiring when your app starts, so open `app.js` and add this before creating any View/App/Frame:


##### JavaScript
```js
var material = require("nativescript-material-bottomsheet");

material.install();
```

##### TypeScript
```ts
import { install } from "nativescript-material-bottomsheet";
install();
```

Uses the same kind of API as [Nativescript Modals](https://docs.nativescript.org/ui/modal-view)

##### TS

```typescript
const modalViewModulets = "ns-ui-category/modal-view/basics/modal-ts-view-page";
export function openBottomSheet(args) {
    const mainView: Button = <Button>args.object;
    const context = { username: "test_username", password: "test" };
    const fullscreen = true;
    mainView.showBottomSheet({
        view: modalViewModulets,
        context,
        closeCallback: (username, password) => {
            bottom-sheet
            alert(`Username: ${username} : Password: ${password}`);
        },
        fullscreen
    });
}

```

### NativeScript + Vue
```typescript
import Vue from 'nativescript-vue';
import BottomSheetPlugin from 'nativescript-material-bottomsheet/vue';

Vue.use(BottomSheetPlugin);
```
Then you can show a Vue component:
```typescript 
import MyComponent from 'MyComponent.vue';

//inside another Vue component
const options: BottomSheetOptions = {
};
this.$showBottomSheet(MyComponent, options)
```


### NativeScript + Angular
First you need to include the `NativeScriptMaterialBottomSheetModule` in your `app.module.ts`

```typescript
import { NativeScriptMaterialBottomSheetModule} from "nativescript-material-bottomsheet/angular";

@NgModule({
    imports: [
        // This will call the install method and inject a global service called BottomSheetService
        NativeScriptMaterialBottomSheetModule.forRoot()
    ],
    ...
})
```
now you can show your custom BottomSheet using the `BottomSheetService`, this service follows the same implementation as the `ModalService`

##### ItemComponent
```typescript
import { Component,  ViewContainerRef } from '@angular/core';
import { BottomSheetOptions, BottomSheetService } from 'nativescript-material-bottomsheet/angular';
import { ShareOptionsComponent } from './share-options.component';

@Component({
    selector: 'ns-item',
    templateUrl: './item.component.html',
    moduleId: module.id
})
export class ItemComponent {
    constructor(
        private bottomSheet: BottomSheetService, 
        private containerRef: ViewContainerRef,
    ) {}

    showOptions() {
        const options: BottomSheetOptions = {
            viewContainerRef: this.containerRef,
            context: ['Facebook', 'Google', 'Twitter']
        };

        this.bottomSheet.show(ShareOptionsComponent, options).subscribe(result => {
            console.log('Option selected:', result);
        });
    }
}
```
##### ShareOptionsComponent
```html
<ListView
    [items]="options"
    (itemTap)="onTap($event)"
    separatorColor="white"
    class="list-group"
    height="200"
>
    <ng-template let-option="item">
        <Label
            class="list-group-item"
            [text]="option"
        ></Label>
    </ng-template>
</ListView>
```
```typescript
import { Component, OnInit } from '@angular/core';
import { BottomSheetParams } from 'nativescript-material-bottomsheet/angular';
import { ItemEventData } from 'tns-core-modules/ui/list-view';

@Component({
    selector: 'ns-share-options',
    templateUrl: 'share-options.component.html'
})
export class ShareOptionsComponent implements OnInit {
    options: string[];
    
    // The BottomSheetService injects the BottomSheetParams to the component
    // so you can get the context and call the closeCallback method from the component displayed in your BottomSheet
    constructor(private params: BottomSheetParams) {}

    ngOnInit() {
        this.options = this.params.context;
    }

    onTap({ index }: ItemEventData) {
        this.params.closeCallback(this.options[index]);
    }
}
```
