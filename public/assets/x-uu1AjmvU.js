var N={exports:{}},r={};/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var z;function et(){if(z)return r;z=1;var f=Symbol.for("react.transitional.element"),a=Symbol.for("react.portal"),l=Symbol.for("react.fragment"),y=Symbol.for("react.strict_mode"),m=Symbol.for("react.profiler"),E=Symbol.for("react.consumer"),A=Symbol.for("react.context"),R=Symbol.for("react.forward_ref"),g=Symbol.for("react.suspense"),k=Symbol.for("react.memo"),T=Symbol.for("react.lazy"),G=Symbol.for("react.activity"),x=Symbol.iterator;function X(t){return t===null||typeof t!="object"?null:(t=x&&t[x]||t["@@iterator"],typeof t=="function"?t:null)}var O={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},b=Object.assign,I={};function d(t,e,o){this.props=t,this.context=e,this.refs=I,this.updater=o||O}d.prototype.isReactComponent={},d.prototype.setState=function(t,e){if(typeof t!="object"&&typeof t!="function"&&t!=null)throw Error("takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,t,e,"setState")},d.prototype.forceUpdate=function(t){this.updater.enqueueForceUpdate(this,t,"forceUpdate")};function L(){}L.prototype=d.prototype;function S(t,e,o){this.props=t,this.context=e,this.refs=I,this.updater=o||O}var j=S.prototype=new L;j.constructor=S,b(j,d.prototype),j.isPureReactComponent=!0;var Y=Array.isArray;function $(){}var c={H:null,A:null,T:null,S:null},U=Object.prototype.hasOwnProperty;function P(t,e,o){var n=o.ref;return{$$typeof:f,type:t,key:e,ref:n!==void 0?n:null,props:o}}function Z(t,e){return P(t.type,e,t.props)}function H(t){return typeof t=="object"&&t!==null&&t.$$typeof===f}function Q(t){var e={"=":"=0",":":"=2"};return"$"+t.replace(/[=:]/g,function(o){return e[o]})}var q=/\/+/g;function M(t,e){return typeof t=="object"&&t!==null&&t.key!=null?Q(""+t.key):e.toString(36)}function J(t){switch(t.status){case"fulfilled":return t.value;case"rejected":throw t.reason;default:switch(typeof t.status=="string"?t.then($,$):(t.status="pending",t.then(function(e){t.status==="pending"&&(t.status="fulfilled",t.value=e)},function(e){t.status==="pending"&&(t.status="rejected",t.reason=e)})),t.status){case"fulfilled":return t.value;case"rejected":throw t.reason}}throw t}function h(t,e,o,n,u){var s=typeof t;(s==="undefined"||s==="boolean")&&(t=null);var i=!1;if(t===null)i=!0;else switch(s){case"bigint":case"string":case"number":i=!0;break;case"object":switch(t.$$typeof){case f:case a:i=!0;break;case T:return i=t._init,h(i(t._payload),e,o,n,u)}}if(i)return u=u(t),i=n===""?"."+M(t,0):n,Y(u)?(o="",i!=null&&(o=i.replace(q,"$&/")+"/"),h(u,e,o,"",function(tt){return tt})):u!=null&&(H(u)&&(u=Z(u,o+(u.key==null||t&&t.key===u.key?"":(""+u.key).replace(q,"$&/")+"/")+i)),e.push(u)),1;i=0;var _=n===""?".":n+":";if(Y(t))for(var p=0;p<t.length;p++)n=t[p],s=_+M(n,p),i+=h(n,e,o,s,u);else if(p=X(t),typeof p=="function")for(t=p.call(t),p=0;!(n=t.next()).done;)n=n.value,s=_+M(n,p++),i+=h(n,e,o,s,u);else if(s==="object"){if(typeof t.then=="function")return h(J(t),e,o,n,u);throw e=String(t),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.")}return i}function w(t,e,o){if(t==null)return t;var n=[],u=0;return h(t,n,"","",function(s){return e.call(o,s,u++)}),n}function V(t){if(t._status===-1){var e=t._result;e=e(),e.then(function(o){(t._status===0||t._status===-1)&&(t._status=1,t._result=o)},function(o){(t._status===0||t._status===-1)&&(t._status=2,t._result=o)}),t._status===-1&&(t._status=0,t._result=e)}if(t._status===1)return t._result.default;throw t._result}var D=typeof reportError=="function"?reportError:function(t){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var e=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof t=="object"&&t!==null&&typeof t.message=="string"?String(t.message):String(t),error:t});if(!window.dispatchEvent(e))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",t);return}console.error(t)},F={map:w,forEach:function(t,e,o){w(t,function(){e.apply(this,arguments)},o)},count:function(t){var e=0;return w(t,function(){e++}),e},toArray:function(t){return w(t,function(e){return e})||[]},only:function(t){if(!H(t))throw Error("React.Children.only expected to receive a single React element child.");return t}};return r.Activity=G,r.Children=F,r.Component=d,r.Fragment=l,r.Profiler=m,r.PureComponent=S,r.StrictMode=y,r.Suspense=g,r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=c,r.__COMPILER_RUNTIME={__proto__:null,c:function(t){return c.H.useMemoCache(t)}},r.cache=function(t){return function(){return t.apply(null,arguments)}},r.cacheSignal=function(){return null},r.cloneElement=function(t,e,o){if(t==null)throw Error("The argument must be a React element, but you passed "+t+".");var n=b({},t.props),u=t.key;if(e!=null)for(s in e.key!==void 0&&(u=""+e.key),e)!U.call(e,s)||s==="key"||s==="__self"||s==="__source"||s==="ref"&&e.ref===void 0||(n[s]=e[s]);var s=arguments.length-2;if(s===1)n.children=o;else if(1<s){for(var i=Array(s),_=0;_<s;_++)i[_]=arguments[_+2];n.children=i}return P(t.type,u,n)},r.createContext=function(t){return t={$$typeof:A,_currentValue:t,_currentValue2:t,_threadCount:0,Provider:null,Consumer:null},t.Provider=t,t.Consumer={$$typeof:E,_context:t},t},r.createElement=function(t,e,o){var n,u={},s=null;if(e!=null)for(n in e.key!==void 0&&(s=""+e.key),e)U.call(e,n)&&n!=="key"&&n!=="__self"&&n!=="__source"&&(u[n]=e[n]);var i=arguments.length-2;if(i===1)u.children=o;else if(1<i){for(var _=Array(i),p=0;p<i;p++)_[p]=arguments[p+2];u.children=_}if(t&&t.defaultProps)for(n in i=t.defaultProps,i)u[n]===void 0&&(u[n]=i[n]);return P(t,s,u)},r.createRef=function(){return{current:null}},r.forwardRef=function(t){return{$$typeof:R,render:t}},r.isValidElement=H,r.lazy=function(t){return{$$typeof:T,_payload:{_status:-1,_result:t},_init:V}},r.memo=function(t,e){return{$$typeof:k,type:t,compare:e===void 0?null:e}},r.startTransition=function(t){var e=c.T,o={};c.T=o;try{var n=t(),u=c.S;u!==null&&u(o,n),typeof n=="object"&&n!==null&&typeof n.then=="function"&&n.then($,D)}catch(s){D(s)}finally{e!==null&&o.types!==null&&(e.types=o.types),c.T=e}},r.unstable_useCacheRefresh=function(){return c.H.useCacheRefresh()},r.use=function(t){return c.H.use(t)},r.useActionState=function(t,e,o){return c.H.useActionState(t,e,o)},r.useCallback=function(t,e){return c.H.useCallback(t,e)},r.useContext=function(t){return c.H.useContext(t)},r.useDebugValue=function(){},r.useDeferredValue=function(t,e){return c.H.useDeferredValue(t,e)},r.useEffect=function(t,e){return c.H.useEffect(t,e)},r.useEffectEvent=function(t){return c.H.useEffectEvent(t)},r.useId=function(){return c.H.useId()},r.useImperativeHandle=function(t,e,o){return c.H.useImperativeHandle(t,e,o)},r.useInsertionEffect=function(t,e){return c.H.useInsertionEffect(t,e)},r.useLayoutEffect=function(t,e){return c.H.useLayoutEffect(t,e)},r.useMemo=function(t,e){return c.H.useMemo(t,e)},r.useOptimistic=function(t,e){return c.H.useOptimistic(t,e)},r.useReducer=function(t,e,o){return c.H.useReducer(t,e,o)},r.useRef=function(t){return c.H.useRef(t)},r.useState=function(t){return c.H.useState(t)},r.useSyncExternalStore=function(t,e,o){return c.H.useSyncExternalStore(t,e,o)},r.useTransition=function(){return c.H.useTransition()},r.version="19.2.0",r}var B;function rt(){return B||(B=1,N.exports=et()),N.exports}var C=rt();/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nt=f=>f.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),ot=f=>f.replace(/^([A-Z])|[\s-_]+(\w)/g,(a,l,y)=>y?y.toUpperCase():l.toLowerCase()),K=f=>{const a=ot(f);return a.charAt(0).toUpperCase()+a.slice(1)},W=(...f)=>f.filter((a,l,y)=>!!a&&a.trim()!==""&&y.indexOf(a)===l).join(" ").trim(),ut=f=>{for(const a in f)if(a.startsWith("aria-")||a==="role"||a==="title")return!0};/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var st={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ct=C.forwardRef(({color:f="currentColor",size:a=24,strokeWidth:l=2,absoluteStrokeWidth:y,className:m="",children:E,iconNode:A,...R},g)=>C.createElement("svg",{ref:g,...st,width:a,height:a,stroke:f,strokeWidth:y?Number(l)*24/Number(a):l,className:W("lucide",m),...!E&&!ut(R)&&{"aria-hidden":"true"},...R},[...A.map(([k,T])=>C.createElement(k,T)),...Array.isArray(E)?E:[E]]));/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=(f,a)=>{const l=C.forwardRef(({className:y,...m},E)=>C.createElement(ct,{ref:E,iconNode:a,className:W(`lucide-${nt(K(f))}`,`lucide-${f}`,y),...m}));return l.displayName=K(f),l};/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const it=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]],vt=v("circle-x",it);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ft=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],dt=v("copy",ft);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const at=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],ht=v("plus",at);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pt=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],mt=v("search",pt);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lt=[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]],Ct=v("square-pen",lt);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yt=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],Rt=v("trash-2",yt);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _t=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],Tt=v("user",_t);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Et=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],wt=v("x",Et);export{vt as C,ht as P,Ct as S,Rt as T,Tt as U,wt as X,mt as a,dt as b,v as c};
