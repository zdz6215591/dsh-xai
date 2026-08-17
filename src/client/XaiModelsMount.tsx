/** Mount the xAI card inside the official Models settings page. */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { XaiSettings } from './XaiSettings.tsx'
import type { XaiOAuthSettingsInjected } from './XaiSettings.tsx'

export type XaiModelsMountProps = Partial<XaiOAuthSettingsInjected>

function modelsContentHost(): HTMLElement | undefined {
  for (const dialog of Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]'))) {
    if (!(dialog instanceof HTMLElement)) continue
    const current = dialog.querySelector('nav button[aria-current="true"]')
    const label = (current?.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (label !== '模型' && label !== 'Models') continue
    const column = dialog.querySelector('nav')?.nextElementSibling
    const options = column?.lastElementChild
    if (options instanceof HTMLElement) return options
  }
  return undefined
}

/** Header-action occupant that portals the account card into Models. */
export function XaiModelsMount({ t }: XaiModelsMountProps) {
  const [host, setHost] = useState<HTMLElement>()

  useEffect(() => {
    let mount: HTMLDivElement | undefined
    const sync = (): void => {
      const page = modelsContentHost()
      if (page === undefined) {
        mount?.remove()
        mount = undefined
        setHost(undefined)
        return
      }
      if (mount !== undefined && mount.parentElement === page) return
      mount?.remove()
      mount = document.createElement('div')
      mount.dataset.dshXai = 'models-card'
      page.insertBefore(mount, page.firstChild)
      setHost(mount)
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-current'],
    })
    return () => {
      observer.disconnect()
      mount?.remove()
    }
  }, [])

  if (t === undefined || host === undefined) return null
  return createPortal(<XaiSettings t={t} />, host)
}
