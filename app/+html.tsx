import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bloomsline" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `body{overflow:hidden}#root{display:flex;flex:1}.ptr-spinner{position:fixed;top:0;left:0;right:0;display:flex;justify-content:center;z-index:9999;pointer-events:none;transition:transform .2s}.ptr-spinner>div{width:32px;height:32px;border-radius:50%;background:#059669;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.15)}` }} />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var startY=0,el=null,spinner=null,pulling=false,triggered=false;function getSpinner(){if(!spinner){spinner=document.createElement('div');spinner.className='ptr-spinner';spinner.innerHTML='<div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></div>';spinner.style.transform='translateY(-50px)';document.body.appendChild(spinner)}return spinner}document.addEventListener('touchstart',function(e){if(triggered)return;var t=e.target;while(t&&t!==document.body){if(t.scrollHeight>t.clientHeight&&getComputedStyle(t).overflowY!=='hidden'){el=t;break}t=t.parentElement}if(el&&el.scrollTop<=0){startY=e.touches[0].pageY;pulling=true}else{el=null;pulling=false}},{passive:true});document.addEventListener('touchmove',function(e){if(!pulling||!el||triggered)return;var diff=e.touches[0].pageY-startY;if(diff<0){pulling=false;return}if(el.scrollTop>0){pulling=false;return}var s=getSpinner();var p=Math.min(diff/120,1);s.style.transform='translateY('+(p*40-50)+'px)';s.querySelector('div').style.opacity=p;if(diff>120){triggered=true;pulling=false;s.style.transform='translateY(8px)';s.querySelector('svg').style.animation='spin .6s linear infinite';var st=document.createElement('style');st.textContent='@keyframes spin{to{transform:rotate(360deg)}}';document.head.appendChild(st);setTimeout(function(){window.location.reload()},400)}},{passive:true});document.addEventListener('touchend',function(){if(!triggered&&spinner){spinner.style.transform='translateY(-50px)'}pulling=false;el=null},{passive:true})})()` }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
