import * as bpclient from '@botpress/client'
import * as bpsdk from '@botpress/sdk'
import { z } from 'zod'
import * as utils from '../utils'
import * as types from './typings'

type SdkEntityDef = NonNullable<bpsdk.IntegrationDefinition['entities']>[string]
type SdkActionDef = NonNullable<bpsdk.IntegrationDefinition['actions']>[string]
type SdkEventDef = NonNullable<bpsdk.IntegrationDefinition['events']>[string]

export namespace from {
  export const sdk = (i: bpsdk.IntegrationDefinition): types.IntegrationDefinition => {
    const ogActionDefs = i.actions ?? {}
    const entitiesActionDefs = _augmentEntityActions(i.entities ?? {})
    const actionDefs = { ...ogActionDefs, ...entitiesActionDefs }

    const ogEventDefs = i.events ?? {}
    const entitiesEventDefs = _augmentEntityEvents(i.entities ?? {})
    const eventDefs = { ...ogEventDefs, ...entitiesEventDefs }

    return {
      id: null,
      name: i.name,
      version: i.version,
      user: {
        tags: i.user?.tags ?? {},
        creation: i.user?.creation ?? { enabled: false, requiredTags: [] },
      },
      configuration: i.configuration ? _mapSchema(i.configuration) : { schema: {} },
      events: utils.records.mapValues(eventDefs, _mapSchema),
      states: i.states ? utils.records.mapValues(i.states, _mapSchema) : {},
      actions: utils.records.mapValues(actionDefs, (a) => ({
        input: _mapSchema(a.input),
        output: _mapSchema(a.output),
      })),
      channels: i.channels
        ? utils.records.mapValues(i.channels, (c) => ({
            conversation: {
              tags: c.conversation?.tags ?? {},
              creation: c.conversation?.creation ?? { enabled: false, requiredTags: [] },
            },
            message: {
              tags: c.message?.tags ?? {},
            },
            messages: utils.records.mapValues(c.messages, _mapSchema),
          }))
        : {},
    }
  }

  export const client = (i: bpclient.Integration): types.IntegrationDefinition => {
    const { id, name, version, configuration, channels, states, events, actions, user } = i
    return { id, name, version, configuration, channels, states, events, actions, user }
  }

  const _mapSchema = <T extends { schema: z.ZodObject<any> }>(
    x: T
  ): utils.types.Merge<T, { schema: ReturnType<typeof utils.schema.mapZodToJsonSchema> }> => ({
    ...x,
    schema: utils.schema.mapZodToJsonSchema(x),
  })

  const _augmentEntityActions = (entities: Record<string, SdkEntityDef>): Record<string, SdkActionDef> => {
    let actions: Record<string, SdkActionDef> = {}
    for (const [name, entity] of Object.entries(entities)) {
      actions = { ...actions, ..._getEntityActions(entity, name) }
    }
    return actions
  }

  const _augmentEntityEvents = (entities: Record<string, SdkEntityDef>): Record<string, SdkEventDef> => {
    let events: Record<string, SdkEventDef> = {}
    for (const [name, entity] of Object.entries(entities)) {
      events = { ...events, ..._getEntityEvents(entity, name) }
    }
    return events
  }

  const _getEntityActions = (entity: SdkEntityDef, name: string): Record<string, SdkActionDef> => {
    const pascalName = utils.casing.to.pascalCase(name)
    const { schema } = entity
    const id: z.ZodRawShape = { id: z.string() }
    const createFn: SdkActionDef = {
      input: { schema },
      output: { schema: z.object({ data: schema.extend(id) }) },
    }
    const readFn: SdkActionDef = {
      input: { schema: z.object(id) },
      output: { schema: z.object({ data: schema.extend(id) }) },
    }
    const updateFn: SdkActionDef = {
      input: { schema: schema.extend(id) },
      output: { schema: z.object({ data: schema.extend(id) }) },
    }
    const deleteFn: SdkActionDef = {
      input: { schema: z.object(id) },
      output: { schema: z.object({}) },
    }
    const listFn: SdkActionDef = {
      input: { schema: z.object({}) },
      output: { schema: z.object({ data: z.array(schema.extend(id)) }) },
    }
    return {
      [`create${pascalName}`]: createFn,
      [`read${pascalName}`]: readFn,
      [`update${pascalName}`]: updateFn,
      [`delete${pascalName}`]: deleteFn,
      [`list${pascalName}`]: listFn,
    }
  }

  const _getEntityEvents = (entity: SdkEntityDef, name: string): Record<string, SdkEventDef> => {
    const pascalName = utils.casing.to.pascalCase(name)
    const { schema } = entity
    const createdEvent: SdkEventDef = { schema: z.object({ data: schema.extend({ id: z.string() }) }) }
    const updatedEvent: SdkEventDef = { schema: z.object({ data: schema.extend({ id: z.string() }) }) }
    const deletedEvent: SdkEventDef = { schema: z.object({ data: schema.extend({ id: z.string() }) }) }
    return {
      [`on${pascalName}Created`]: createdEvent,
      [`on${pascalName}Updated`]: updatedEvent,
      [`on${pascalName}Deleted`]: deletedEvent,
    }
  }
}
