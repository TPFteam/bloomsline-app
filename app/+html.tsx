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

        <style dangerouslySetInnerHTML={{ __html: `html,body{height:100%;margin:0}body{overflow-x:hidden;overscroll-behavior-y:auto}#root{display:flex;flex:1;height:100%}` }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
