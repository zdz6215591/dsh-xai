/** Browser half: xAI Grok account management inside dsh Settings. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { XaiSettings } from './XaiSettings.tsx'
import type { XaiOAuthSettingsInjected } from './XaiSettings.tsx'
import { en, zh } from './locales.ts'
import type { XaiOAuthSettingsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.xai-oauth': XaiOAuthSettingsKey
  }
}

export const name = 'dsh-xai-client'
export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  const namespace = 'settings.xai-oauth'
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }), 'dsh-xai: settings copy')
  const t = ctx.locale.bind(namespace) as XaiOAuthSettingsInjected['t']
  // Same section id as the official Models page so the settings shell
  // renders this card in that page (`only: 'models'`). The nav key is `id`,
  // so this does not add a sibling next to 通用 / 模型 / 插件.
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'models',
    order: 11,
    label: () => t('nav'),
    inject: (): XaiOAuthSettingsInjected => ({ t }),
  }, XaiSettings))
}
