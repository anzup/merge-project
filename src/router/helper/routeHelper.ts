import type { AppRouteModule, AppRouteRecordRaw } from '/@/router/types'
import type { Router, RouteRecordNormalized } from 'vue-router'

// @ts-ignore
import { LAYOUT } from '/@/router/constant'
import { cloneDeep, omit } from 'lodash-es'

import { createRouter, createWebHashHistory } from 'vue-router'

const LayoutMap = new Map<string, () => Promise<typeof import('*.vue')>>()

LayoutMap.set('LAYOUT', LAYOUT)

/**
 * Convert multi-level routing to level 2 routing
 */
export function flatMultiLevelRoutes(routeModules: AppRouteModule[]) {
  const modules: AppRouteModule[] = cloneDeep(routeModules)
  for (let index = 0; index < modules.length; index++) {
    const routeModule = modules[index]
    if (!isMultipleRoute(routeModule)) {
      continue
    }
    promoteRouteLevel(routeModule)
  }
  return modules
}

// Routing level upgrade
function promoteRouteLevel(routeModule: AppRouteModule) {
  // Use vue-router to splice menus
  let router: Router | null = createRouter({
    routes: [routeModule as unknown as RouteRecordNormalized],
    history: createWebHashHistory(),
  })

  const routes = router.getRoutes()
  addToChildren(routes, routeModule.children || [], routeModule)
  router = null

  routeModule.children = routeModule.children?.map((item) => omit(item, 'children'))
}

// Add all sub-routes to the secondary route
function addToChildren(
  routes: RouteRecordNormalized[],
  children: AppRouteRecordRaw[],
  routeModule: AppRouteModule,
) {
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    const route = routes.find((item) => item.name === child.name)
    if (!route) {
      continue
    }
    routeModule.children = routeModule.children || []
    if (!routeModule.children.find((item) => item.name === route.name)) {
      routeModule.children?.push(route as unknown as AppRouteModule)
    }
    if (child.children?.length) {
      addToChildren(routes, child.children, routeModule)
    }
  }
}

// Determine whether the level exceeds 2 levels
function isMultipleRoute(routeModule: AppRouteModule) {
  if (!routeModule || !Reflect.has(routeModule, 'children') || !routeModule.children?.length) {
    return false
  }

  const children = routeModule.children

  let flag = false
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    if (child.children?.length) {
      flag = true
      break
    }
  }
  return flag
}
