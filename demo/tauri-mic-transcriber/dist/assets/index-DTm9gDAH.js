(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const n of o.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function e(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(i){if(i.ep)return;i.ep=!0;const o=e(i);fetch(i.href,o)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const k=globalThis,K=k.ShadowRoot&&(k.ShadyCSS===void 0||k.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Q=Symbol(),rt=new WeakMap;let gt=class{constructor(t,e,r){if(this._$cssResult$=!0,r!==Q)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(K&&t===void 0){const r=e!==void 0&&e.length===1;r&&(t=rt.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&rt.set(e,t))}return t}toString(){return this.cssText}};const At=s=>new gt(typeof s=="string"?s:s+"",void 0,Q),H=(s,...t)=>{const e=s.length===1?s[0]:t.reduce((r,i,o)=>r+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+s[o+1],s[0]);return new gt(e,s,Q)},xt=(s,t)=>{if(K)s.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const e of t){const r=document.createElement("style"),i=k.litNonce;i!==void 0&&r.setAttribute("nonce",i),r.textContent=e.cssText,s.appendChild(r)}},ot=K?s=>s:s=>s instanceof CSSStyleSheet?(t=>{let e="";for(const r of t.cssRules)e+=r.cssText;return At(e)})(s):s;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:wt,defineProperty:Et,getOwnPropertyDescriptor:St,getOwnPropertyNames:Pt,getOwnPropertySymbols:Ct,getPrototypeOf:Ot}=Object,V=globalThis,nt=V.trustedTypes,Dt=nt?nt.emptyScript:"",Tt=V.reactiveElementPolyfillSupport,T=(s,t)=>s,F={toAttribute(s,t){switch(t){case Boolean:s=s?Dt:null;break;case Object:case Array:s=s==null?s:JSON.stringify(s)}return s},fromAttribute(s,t){let e=s;switch(t){case Boolean:e=s!==null;break;case Number:e=s===null?null:Number(s);break;case Object:case Array:try{e=JSON.parse(s)}catch{e=null}}return e}},Y=(s,t)=>!wt(s,t),at={attribute:!0,type:String,converter:F,reflect:!1,useDefault:!1,hasChanged:Y};Symbol.metadata??=Symbol("metadata"),V.litPropertyMetadata??=new WeakMap;let E=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=at){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const r=Symbol(),i=this.getPropertyDescriptor(t,r,e);i!==void 0&&Et(this.prototype,t,i)}}static getPropertyDescriptor(t,e,r){const{get:i,set:o}=St(this.prototype,t)??{get(){return this[e]},set(n){this[e]=n}};return{get:i,set(n){const l=i?.call(this);o?.call(this,n),this.requestUpdate(t,l,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??at}static _$Ei(){if(this.hasOwnProperty(T("elementProperties")))return;const t=Ot(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(T("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(T("properties"))){const e=this.properties,r=[...Pt(e),...Ct(e)];for(const i of r)this.createProperty(i,e[i])}const t=this[Symbol.metadata];if(t!==null){const e=litPropertyMetadata.get(t);if(e!==void 0)for(const[r,i]of e)this.elementProperties.set(r,i)}this._$Eh=new Map;for(const[e,r]of this.elementProperties){const i=this._$Eu(e,r);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const i of r)e.unshift(ot(i))}else t!==void 0&&e.push(ot(t));return e}static _$Eu(t,e){const r=e.attribute;return r===!1?void 0:typeof r=="string"?r:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const r of e.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return xt(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,r){this._$AK(t,r)}_$ET(t,e){const r=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,r);if(i!==void 0&&r.reflect===!0){const o=(r.converter?.toAttribute!==void 0?r.converter:F).toAttribute(e,r.type);this._$Em=t,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,e){const r=this.constructor,i=r._$Eh.get(t);if(i!==void 0&&this._$Em!==i){const o=r.getPropertyOptions(i),n=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:F;this._$Em=i;const l=n.fromAttribute(e,o.type);this[i]=l??this._$Ej?.get(i)??l,this._$Em=null}}requestUpdate(t,e,r,i=!1,o){if(t!==void 0){const n=this.constructor;if(i===!1&&(o=this[t]),r??=n.getPropertyOptions(t),!((r.hasChanged??Y)(o,e)||r.useDefault&&r.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,r))))return;this.C(t,e,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:r,reflect:i,wrapped:o},n){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),o!==!0||n!==void 0)||(this._$AL.has(t)||(this.hasUpdated||r||(e=void 0),this._$AL.set(t,e)),i===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}const r=this.constructor.elementProperties;if(r.size>0)for(const[i,o]of r){const{wrapped:n}=o,l=this[i];n!==!0||this._$AL.has(i)||l===void 0||this.C(i,void 0,o,l)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(r=>r.hostUpdate?.()),this.update(e)):this._$EM()}catch(r){throw t=!1,this._$EM(),r}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};E.elementStyles=[],E.shadowRootOptions={mode:"open"},E[T("elementProperties")]=new Map,E[T("finalized")]=new Map,Tt?.({ReactiveElement:E}),(V.reactiveElementVersions??=[]).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const X=globalThis,lt=s=>s,B=X.trustedTypes,dt=B?B.createPolicy("lit-html",{createHTML:s=>s}):void 0,$t="$lit$",_=`lit$${Math.random().toFixed(9).slice(2)}$`,_t="?"+_,Mt=`<${_t}>`,x=document,M=()=>x.createComment(""),R=s=>s===null||typeof s!="object"&&typeof s!="function",tt=Array.isArray,Rt=s=>tt(s)||typeof s?.[Symbol.iterator]=="function",J=`[ 	
\f\r]`,D=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ct=/-->/g,ht=/>/g,v=RegExp(`>|${J}(?:([^\\s"'>=/]+)(${J}*=${J}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),pt=/'/g,ut=/"/g,bt=/^(?:script|style|textarea|title)$/i,Nt=s=>(t,...e)=>({_$litType$:s,strings:t,values:e}),f=Nt(1),S=Symbol.for("lit-noChange"),h=Symbol.for("lit-nothing"),ft=new WeakMap,A=x.createTreeWalker(x,129);function yt(s,t){if(!tt(s)||!s.hasOwnProperty("raw"))throw Error("invalid template strings array");return dt!==void 0?dt.createHTML(t):t}const Lt=(s,t)=>{const e=s.length-1,r=[];let i,o=t===2?"<svg>":t===3?"<math>":"",n=D;for(let l=0;l<e;l++){const a=s[l];let c,p,d=-1,m=0;for(;m<a.length&&(n.lastIndex=m,p=n.exec(a),p!==null);)m=n.lastIndex,n===D?p[1]==="!--"?n=ct:p[1]!==void 0?n=ht:p[2]!==void 0?(bt.test(p[2])&&(i=RegExp("</"+p[2],"g")),n=v):p[3]!==void 0&&(n=v):n===v?p[0]===">"?(n=i??D,d=-1):p[1]===void 0?d=-2:(d=n.lastIndex-p[2].length,c=p[1],n=p[3]===void 0?v:p[3]==='"'?ut:pt):n===ut||n===pt?n=v:n===ct||n===ht?n=D:(n=v,i=void 0);const $=n===v&&s[l+1].startsWith("/>")?" ":"";o+=n===D?a+Mt:d>=0?(r.push(c),a.slice(0,d)+$t+a.slice(d)+_+$):a+_+(d===-2?l:$)}return[yt(s,o+(s[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),r]};class N{constructor({strings:t,_$litType$:e},r){let i;this.parts=[];let o=0,n=0;const l=t.length-1,a=this.parts,[c,p]=Lt(t,e);if(this.el=N.createElement(c,r),A.currentNode=this.el.content,e===2||e===3){const d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(i=A.nextNode())!==null&&a.length<l;){if(i.nodeType===1){if(i.hasAttributes())for(const d of i.getAttributeNames())if(d.endsWith($t)){const m=p[n++],$=i.getAttribute(d).split(_),j=/([.?@])?(.*)/.exec(m);a.push({type:1,index:o,name:j[2],strings:$,ctor:j[1]==="."?Ht:j[1]==="?"?zt:j[1]==="@"?Wt:q}),i.removeAttribute(d)}else d.startsWith(_)&&(a.push({type:6,index:o}),i.removeAttribute(d));if(bt.test(i.tagName)){const d=i.textContent.split(_),m=d.length-1;if(m>0){i.textContent=B?B.emptyScript:"";for(let $=0;$<m;$++)i.append(d[$],M()),A.nextNode(),a.push({type:2,index:++o});i.append(d[m],M())}}}else if(i.nodeType===8)if(i.data===_t)a.push({type:2,index:o});else{let d=-1;for(;(d=i.data.indexOf(_,d+1))!==-1;)a.push({type:7,index:o}),d+=_.length-1}o++}}static createElement(t,e){const r=x.createElement("template");return r.innerHTML=t,r}}function P(s,t,e=s,r){if(t===S)return t;let i=r!==void 0?e._$Co?.[r]:e._$Cl;const o=R(t)?void 0:t._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(s),i._$AT(s,e,r)),r!==void 0?(e._$Co??=[])[r]=i:e._$Cl=i),i!==void 0&&(t=P(s,i._$AS(s,t.values),i,r)),t}class Ut{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:r}=this._$AD,i=(t?.creationScope??x).importNode(e,!0);A.currentNode=i;let o=A.nextNode(),n=0,l=0,a=r[0];for(;a!==void 0;){if(n===a.index){let c;a.type===2?c=new z(o,o.nextSibling,this,t):a.type===1?c=new a.ctor(o,a.name,a.strings,this,t):a.type===6&&(c=new It(o,this,t)),this._$AV.push(c),a=r[++l]}n!==a?.index&&(o=A.nextNode(),n++)}return A.currentNode=x,i}p(t){let e=0;for(const r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(t,r,e),e+=r.strings.length-2):r._$AI(t[e])),e++}}class z{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,r,i){this.type=2,this._$AH=h,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=r,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=P(this,t,e),R(t)?t===h||t==null||t===""?(this._$AH!==h&&this._$AR(),this._$AH=h):t!==this._$AH&&t!==S&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Rt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==h&&R(this._$AH)?this._$AA.nextSibling.data=t:this.T(x.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:r}=t,i=typeof r=="number"?this._$AC(t):(r.el===void 0&&(r.el=N.createElement(yt(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===i)this._$AH.p(e);else{const o=new Ut(i,this),n=o.u(this.options);o.p(e),this.T(n),this._$AH=o}}_$AC(t){let e=ft.get(t.strings);return e===void 0&&ft.set(t.strings,e=new N(t)),e}k(t){tt(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let r,i=0;for(const o of t)i===e.length?e.push(r=new z(this.O(M()),this.O(M()),this,this.options)):r=e[i],r._$AI(o),i++;i<e.length&&(this._$AR(r&&r._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const r=lt(t).nextSibling;lt(t).remove(),t=r}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class q{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,r,i,o){this.type=1,this._$AH=h,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=o,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=h}_$AI(t,e=this,r,i){const o=this.strings;let n=!1;if(o===void 0)t=P(this,t,e,0),n=!R(t)||t!==this._$AH&&t!==S,n&&(this._$AH=t);else{const l=t;let a,c;for(t=o[0],a=0;a<o.length-1;a++)c=P(this,l[r+a],e,a),c===S&&(c=this._$AH[a]),n||=!R(c)||c!==this._$AH[a],c===h?t=h:t!==h&&(t+=(c??"")+o[a+1]),this._$AH[a]=c}n&&!i&&this.j(t)}j(t){t===h?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Ht extends q{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===h?void 0:t}}class zt extends q{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==h)}}class Wt extends q{constructor(t,e,r,i,o){super(t,e,r,i,o),this.type=5}_$AI(t,e=this){if((t=P(this,t,e,0)??h)===S)return;const r=this._$AH,i=t===h&&r!==h||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,o=t!==h&&(r===h||i);i&&this.element.removeEventListener(this.name,this,r),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class It{constructor(t,e,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){P(this,t)}}const jt=X.litHtmlPolyfillSupport;jt?.(N,z),(X.litHtmlVersions??=[]).push("3.3.3");const kt=(s,t,e)=>{const r=e?.renderBefore??t;let i=r._$litPart$;if(i===void 0){const o=e?.renderBefore??null;r._$litPart$=i=new z(t.insertBefore(M(),o),o,void 0,e??{})}return i._$AI(s),i};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const et=globalThis;class g extends E{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=kt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return S}}g._$litElement$=!0,g.finalized=!0,et.litElementHydrateSupport?.({LitElement:g});const Ft=et.litElementPolyfillSupport;Ft?.({LitElement:g});(et.litElementVersions??=[]).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const W=s=>(t,e)=>{e!==void 0?e.addInitializer(()=>{customElements.define(s,t)}):customElements.define(s,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Bt={attribute:!0,type:String,converter:F,reflect:!1,hasChanged:Y},Vt=(s=Bt,t,e)=>{const{kind:r,metadata:i}=e;let o=globalThis.litPropertyMetadata.get(i);if(o===void 0&&globalThis.litPropertyMetadata.set(i,o=new Map),r==="setter"&&((s=Object.create(s)).wrapped=!0),o.set(e.name,s),r==="accessor"){const{name:n}=e;return{set(l){const a=t.get.call(this);t.set.call(this,l),this.requestUpdate(n,a,s,!0,l)},init(l){return l!==void 0&&this.C(n,void 0,s,l),l}}}if(r==="setter"){const{name:n}=e;return function(l){const a=this[n];t.call(this,l),this.requestUpdate(n,a,s,!0,l)}}throw Error("Unsupported decorator location: "+r)};function G(s){return(t,e)=>typeof e=="object"?Vt(s,t,e):((r,i,o)=>{const n=i.hasOwnProperty(o);return i.constructor.createProperty(o,r),n?Object.getOwnPropertyDescriptor(i,o):void 0})(s,t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function u(s){return G({...s,state:!0,attribute:!1})}function qt(s,t=!1){return window.__TAURI_INTERNALS__.transformCallback(s,t)}async function b(s,t={},e){return window.__TAURI_INTERNALS__.invoke(s,t,e)}var mt;(function(s){s.WINDOW_RESIZED="tauri://resize",s.WINDOW_MOVED="tauri://move",s.WINDOW_CLOSE_REQUESTED="tauri://close-requested",s.WINDOW_DESTROYED="tauri://destroyed",s.WINDOW_FOCUS="tauri://focus",s.WINDOW_BLUR="tauri://blur",s.WINDOW_SCALE_FACTOR_CHANGED="tauri://scale-change",s.WINDOW_THEME_CHANGED="tauri://theme-changed",s.WINDOW_CREATED="tauri://window-created",s.WINDOW_SUSPENDED="tauri://suspended",s.WINDOW_RESUMED="tauri://resumed",s.WEBVIEW_CREATED="tauri://webview-created",s.DRAG_ENTER="tauri://drag-enter",s.DRAG_OVER="tauri://drag-over",s.DRAG_DROP="tauri://drag-drop",s.DRAG_LEAVE="tauri://drag-leave"})(mt||(mt={}));async function Gt(s,t){window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(s,t),await b("plugin:event|unlisten",{event:s,eventId:t})}async function Zt(s,t,e){var r;const i=(r=void 0)!==null&&r!==void 0?r:{kind:"Any"};return b("plugin:event|listen",{event:s,target:i,handler:qt(t)}).then(o=>async()=>Gt(s,o))}async function vt(s={}){return typeof s=="object"&&Object.freeze(s),await b("plugin:dialog|open",{options:s})}var Jt=Object.defineProperty,Kt=Object.getOwnPropertyDescriptor,O=(s,t,e,r)=>{for(var i=r>1?void 0:r?Kt(t,e):t,o=s.length-1,n;o>=0;o--)(n=s[o])&&(i=(r?n(t,e,i):n(i))||i);return r&&i&&Jt(t,e,i),i};let y=class extends g{constructor(){super(...arguments),this.isLoaded=!1,this.modelPath="",this.isDownloading=!1,this.downloadProgress=null,this.statusMessage="No model loaded. Please select or download a model."}async connectedCallback(){super.connectedCallback(),await Zt("download-progress",s=>{this.downloadProgress=s.payload})}async selectDirectory(){try{const s=await vt({directory:!0,multiple:!1,title:"Select Moonshine Model Directory (e.g. tiny-en)"});s&&typeof s=="string"&&await this.loadModelPath(s)}catch(s){this.statusMessage=`Error selecting directory: ${s}`}}async downloadTinyModel(){this.isDownloading=!0,this.statusMessage="Fetching model dependencies manifest...";try{const s=await b("get_stt_dependencies",{language:"en",modelArch:0});this.statusMessage="Downloading model files from CDN...";const e=await b("download_model_files",{manifestJson:s,destDir:"models/tiny-en/quantized/tiny-en"});this.statusMessage="Download complete. Loading model into memory...",await this.loadModelPath(e)}catch(s){this.statusMessage=`Download failed: ${s}`,this.isLoaded=!1}finally{this.isDownloading=!1}}async loadModelPath(s){try{const t=await b("load_transcriber",{modelDir:s,archU32:0});this.modelPath=s,this.isLoaded=!0,this.statusMessage=t,this.dispatchEvent(new CustomEvent("model-loaded",{detail:{modelPath:s,loaded:!0},bubbles:!0,composed:!0}))}catch(t){this.isLoaded=!1,this.statusMessage=`Failed to load model: ${t}`}}render(){return f`
      <h2>1. Model Selection</h2>
      <div class="status-badge ${this.isLoaded?"loaded":"not-loaded"}">
        ${this.isLoaded?"Model Loaded":"No Model Loaded"}
      </div>

      <div class="actions">
        <button
          class="primary-btn"
          ?disabled=${this.isDownloading}
          @click=${this.selectDirectory}
        >
          📁 Browse Local Directory
        </button>

        <button
          class="secondary-btn"
          ?disabled=${this.isDownloading}
          @click=${this.downloadTinyModel}
        >
          ⬇️ Auto-Download tiny-en Model
        </button>
      </div>

      ${this.isDownloading&&this.downloadProgress?f`
            <div class="progress-bar">
              <div
                class="progress-fill"
                style="width: ${this.downloadProgress.percent}%"
              ></div>
            </div>
            <div class="progress-text">
              Downloading ${this.downloadProgress.file_name}:
              ${(this.downloadProgress.downloaded_bytes/1024/1024).toFixed(1)}MB /
              ${(this.downloadProgress.total_bytes/1024/1024).toFixed(1)}MB
              (${this.downloadProgress.percent.toFixed(1)}%)
            </div>
          `:""}

      <div class="progress-text">${this.statusMessage}</div>
      ${this.modelPath?f`<div class="model-path">Active Path: ${this.modelPath}</div>`:""}
    `}};y.styles=H`
    :host {
      display: block;
      background-color: var(--panel-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    h2 {
      font-size: 1.1rem;
      margin-bottom: 12px;
      color: var(--accent-color, #38bdf8);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .loaded {
      background-color: rgba(74, 222, 128, 0.2);
      color: #4ade80;
    }

    .not-loaded {
      background-color: rgba(248, 113, 113, 0.2);
      color: #f87171;
    }

    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }

    .progress-bar {
      margin-top: 12px;
      width: 100%;
      height: 8px;
      background-color: var(--border-color, #334155);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background-color: var(--accent-color, #38bdf8);
      width: 0%;
      transition: width 0.2s;
    }

    .progress-text {
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 6px;
    }

    .model-path {
      font-family: monospace;
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
      word-break: break-all;
      margin-top: 8px;
    }
  `;O([u()],y.prototype,"isLoaded",2);O([u()],y.prototype,"modelPath",2);O([u()],y.prototype,"isDownloading",2);O([u()],y.prototype,"downloadProgress",2);O([u()],y.prototype,"statusMessage",2);y=O([W("moonshine-model-picker")],y);var Qt=Object.defineProperty,Yt=Object.getOwnPropertyDescriptor,I=(s,t,e,r)=>{for(var i=r>1?void 0:r?Yt(t,e):t,o=s.length-1,n;o>=0;o--)(n=s[o])&&(i=(r?n(t,e,i):n(i))||i);return r&&i&&Qt(t,e,i),i};let w=class extends g{constructor(){super(...arguments),this.modelLoaded=!1,this.isRecording=!1,this.isProcessing=!1,this.statusText="Ready to record.",this.audioContext=null,this.mediaStream=null,this.pcmSamples=[]}async startRecording(){if(!this.modelLoaded){this.statusText="Please load a model first.";return}try{this.mediaStream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,noiseSuppression:!0}}),this.audioContext=new AudioContext({sampleRate:16e3});const s=this.audioContext.createMediaStreamSource(this.mediaStream),t=this.audioContext.createScriptProcessor(4096,1,1);this.pcmSamples=[],t.onaudioprocess=e=>{if(!this.isRecording)return;const r=e.inputBuffer.getChannelData(0);for(let i=0;i<r.length;i++)this.pcmSamples.push(r[i])},s.connect(t),t.connect(this.audioContext.destination),this.isRecording=!0,this.statusText="Recording... Speak into your microphone."}catch(s){this.statusText=`Microphone access error: ${s.message||s}`}}async stopRecording(){if(!this.isRecording)return;this.isRecording=!1,this.isProcessing=!0,this.statusText="Processing recorded audio...",this.mediaStream&&(this.mediaStream.getTracks().forEach(e=>e.stop()),this.mediaStream=null),this.audioContext&&(await this.audioContext.close(),this.audioContext=null);const s=16e3,t=(this.pcmSamples.length/s).toFixed(1);this.statusText=`Transcribing ${t}s of audio...`;try{const e=await b("transcribe_pcm_samples",{pcmSamples:this.pcmSamples,sampleRate:s});this.statusText=`Transcription complete (${t}s recorded).`,this.dispatchEvent(new CustomEvent("transcript-result",{detail:{transcript:e},bubbles:!0,composed:!0}))}catch(e){this.statusText=`Transcription error: ${e}`}finally{this.isProcessing=!1}}render(){return f`
      <h2>2. Live Microphone Dictation</h2>

      <div class="controls">
        ${this.isRecording?f`
              <button
                class="danger-btn"
                @click=${this.stopRecording}
              >
                ⏹️ Stop Recording
              </button>
              <div class="recording-indicator">
                <div class="pulse"></div>
                Recording active...
              </div>
            `:f`
              <button
                class="primary-btn"
                ?disabled=${!this.modelLoaded||this.isProcessing}
                @click=${this.startRecording}
              >
                🎙️ Start Recording
              </button>
            `}
      </div>

      <div class="status-text">${this.statusText}</div>
    `}};w.styles=H`
    :host {
      display: block;
      background-color: var(--panel-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    h2 {
      font-size: 1.1rem;
      margin-bottom: 12px;
      color: var(--accent-color, #38bdf8);
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .recording-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--danger-color, #f87171);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .pulse {
      width: 12px;
      height: 12px;
      background-color: var(--danger-color, #f87171);
      border-radius: 50%;
      animation: pulse-anim 1.5s infinite;
    }

    @keyframes pulse-anim {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 10px rgba(248, 113, 113, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(248, 113, 113, 0);
      }
    }

    .status-text {
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 8px;
    }
  `;I([G({type:Boolean})],w.prototype,"modelLoaded",2);I([u()],w.prototype,"isRecording",2);I([u()],w.prototype,"isProcessing",2);I([u()],w.prototype,"statusText",2);w=I([W("moonshine-mic-recorder")],w);var Xt=Object.defineProperty,te=Object.getOwnPropertyDescriptor,Z=(s,t,e,r)=>{for(var i=r>1?void 0:r?te(t,e):t,o=s.length-1,n;o>=0;o--)(n=s[o])&&(i=(r?n(t,e,i):n(i))||i);return r&&i&&Xt(t,e,i),i};let C=class extends g{constructor(){super(...arguments),this.modelLoaded=!1,this.isTranscribing=!1,this.statusText="Select or drop an audio file (MP3, WAV, AAC, FLAC, OGG, M4A)."}async selectFile(){if(!this.modelLoaded){this.statusText="Please load a model first.";return}try{const s=await vt({multiple:!1,filters:[{name:"Audio Files",extensions:["mp3","wav","aac","flac","ogg","m4a","caf"]}]});s&&typeof s=="string"&&await this.transcribeFile(s)}catch(s){this.statusText=`Error selecting file: ${s}`}}async transcribeFile(s){this.isTranscribing=!0,this.statusText=`Decoding and transcribing: ${s}...`;const t=performance.now();try{const e=await b("transcribe_audio_file",{filePath:s}),r=((performance.now()-t)/1e3).toFixed(2);this.statusText=`Transcription finished in ${r}s.`,this.dispatchEvent(new CustomEvent("transcript-result",{detail:{transcript:e},bubbles:!0,composed:!0}))}catch(e){this.statusText=`Error transcribing file: ${e}`}finally{this.isTranscribing=!1}}render(){return f`
      <h2>3. Audio File Transcription</h2>

      <div class="drop-zone" @click=${this.selectFile}>
        <div class="drop-title">📂 Choose an Audio File</div>
        <div class="drop-sub">
          Supports MP3, WAV, AAC, FLAC, OGG, M4A, CAF (auto-resampled via rubato)
        </div>
      </div>

      <div class="status-text">${this.statusText}</div>
    `}};C.styles=H`
    :host {
      display: block;
      background-color: var(--panel-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    h2 {
      font-size: 1.1rem;
      margin-bottom: 12px;
      color: var(--accent-color, #38bdf8);
    }

    .drop-zone {
      border: 2px dashed var(--border-color, #334155);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
    }

    .drop-zone:hover {
      border-color: var(--accent-color, #38bdf8);
      background-color: rgba(56, 189, 248, 0.05);
    }

    .drop-title {
      font-size: 1rem;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .drop-sub {
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
    }

    .status-text {
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 12px;
    }
  `;Z([G({type:Boolean})],C.prototype,"modelLoaded",2);Z([u()],C.prototype,"isTranscribing",2);Z([u()],C.prototype,"statusText",2);C=Z([W("moonshine-file-drop")],C);var ee=Object.defineProperty,se=Object.getOwnPropertyDescriptor,st=(s,t,e,r)=>{for(var i=r>1?void 0:r?se(t,e):t,o=s.length-1,n;o>=0;o--)(n=s[o])&&(i=(r?n(t,e,i):n(i))||i);return r&&i&&ee(t,e,i),i};let L=class extends g{constructor(){super(...arguments),this.transcript=null,this.copied=!1}copyTranscript(){if(!this.transcript||!this.transcript.lines)return;const s=this.transcript.lines.map(t=>t.text).join(`
`);navigator.clipboard.writeText(s),this.copied=!0,setTimeout(()=>{this.copied=!1},2e3)}render(){const s=this.transcript?.lines||[];return f`
      <div class="header">
        <h2>4. Transcript Output</h2>
        ${s.length>0?f`
              <button class="secondary-btn" @click=${this.copyTranscript}>
                ${this.copied?"✓ Copied!":"📋 Copy Transcript"}
              </button>
            `:""}
      </div>

      <div class="transcript-box">
        ${s.length===0?f`<div class="empty-msg">
              No transcript yet. Load a model and record microphone or select an audio file.
            </div>`:s.map(t=>f`
                <div class="line">
                  <span class="timestamp">
                    [${t.start_time.toFixed(2)}s -
                    ${(t.start_time+t.duration).toFixed(2)}s]
                  </span>
                  <span class="text">${t.text}</span>
                </div>
              `)}
      </div>
    `}};L.styles=H`
    :host {
      display: block;
      background-color: var(--panel-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 8px;
      padding: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    h2 {
      font-size: 1.1rem;
      color: var(--accent-color, #38bdf8);
    }

    .transcript-box {
      background-color: #0f172a;
      border: 1px solid var(--border-color, #334155);
      border-radius: 6px;
      padding: 16px;
      max-height: 360px;
      overflow-y: auto;
    }

    .empty-msg {
      color: var(--text-muted, #94a3b8);
      font-style: italic;
      font-size: 0.9rem;
    }

    .line {
      margin-bottom: 10px;
      line-height: 1.5;
    }

    .timestamp {
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--accent-color, #38bdf8);
      margin-right: 8px;
    }

    .text {
      color: var(--text-main, #f8fafc);
    }
  `;st([G({type:Object})],L.prototype,"transcript",2);st([u()],L.prototype,"copied",2);L=st([W("moonshine-transcript-view")],L);var ie=Object.defineProperty,re=Object.getOwnPropertyDescriptor,it=(s,t,e,r)=>{for(var i=r>1?void 0:r?re(t,e):t,o=s.length-1,n;o>=0;o--)(n=s[o])&&(i=(r?n(t,e,i):n(i))||i);return r&&i&&ie(t,e,i),i};let U=class extends g{constructor(){super(...arguments),this.modelLoaded=!1,this.currentTranscript=null}handleModelLoaded(s){this.modelLoaded=s.detail.loaded}handleTranscriptResult(s){this.currentTranscript=s.detail.transcript}render(){return f`
      <header>
        <h1>Moonshine Voice STT Demo</h1>
        <div class="subtitle">
          On-device speech-to-text in Rust + Tauri v2 + Lit Web Components
        </div>
      </header>

      <div class="grid">
        <moonshine-model-picker
          @model-loaded=${this.handleModelLoaded}
        ></moonshine-model-picker>

        <moonshine-mic-recorder
          .modelLoaded=${this.modelLoaded}
          @transcript-result=${this.handleTranscriptResult}
        ></moonshine-mic-recorder>

        <moonshine-file-drop
          .modelLoaded=${this.modelLoaded}
          @transcript-result=${this.handleTranscriptResult}
        ></moonshine-file-drop>

        <moonshine-transcript-view
          .transcript=${this.currentTranscript}
        ></moonshine-transcript-view>
      </div>
    `}};U.styles=H`
    :host {
      display: block;
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }

    header {
      margin-bottom: 24px;
      text-align: center;
    }

    h1 {
      font-size: 1.8rem;
      color: var(--accent-color, #38bdf8);
      margin-bottom: 8px;
    }

    .subtitle {
      color: var(--text-muted, #94a3b8);
      font-size: 0.95rem;
    }

    .grid {
      display: grid;
      gap: 20px;
    }
  `;it([u()],U.prototype,"modelLoaded",2);it([u()],U.prototype,"currentTranscript",2);U=it([W("moonshine-demo-app")],U);
