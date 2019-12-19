const _ = require('lodash')
const Op = require('sequelize').Sequelize.Op
const pluralize = require('pluralize')

module.exports = (models) => {

  const smartApi = {}

  const getScope = (scopes) => {
    if (scopes) {
      const scopesCopy = _.cloneDeep(scopes)
      return scopesCopy.map(scope => scope.name)
    } else {
      return []
    }
  }

  const getInclude = (req, includes, where) => {
    if (includes) {
      const includesCopy = _.cloneDeep(includes)
      return includesCopy.map(include => {
        // 这一段是为了解决查询参数中含有.a.b这样的参数
        let passDownWhere = {}
        for (const key of _.keys(where)) {
          if (key.indexOf('.') !== -1) {
            // 如果是参数中含有. 则把.去掉然后split一下
            const newKey = key.substr(1)
            const columns = newKey.split('.')
            if (columns[0] === include.model) {
              if (columns.length > 2) {
                columns.shift()
                passDownWhere = { ['.' + columns.join('.')]: where[key] }
              } else if (columns.length === 2) {
                include.where = {
                  [columns[1]]: where[key]
                }
              }
              break
            }
          }
        }
        //
        include.model = models[include.model]
        if (include.include) {
          include.include = getInclude(req, include.include, passDownWhere)
        }
        return include
      })
    } else {
      return []
    }
  }

  // 搜索条件 searchColumns 可搜索的字段名, search 搜索关键字
  const getSearchCondition = (searchColumns, search) => {
    let searchCondition = {}
    if (searchColumns && search && search !== '') {
      for (const searchColumn of searchColumns) {
        searchCondition[searchColumn] = { [Op.like]: '%' + search + '%' }
      }
      searchCondition = { [Op.or]: searchCondition }
    }
    return searchCondition
  }

  var getAdditionalBody = (req, bodys) => {
    if (bodys) {
      var body = {}
      for (var i in bodys) {
        body[bodys[i].name] = bodys[i].value
      }
      return body
    } else {
      return {}
    }
  }

  // 主要目的是把数组形式的查询条件改为$in的模式
  // 另外参数中有 - 的转化为between方式
  const getWhereCondition = (conditions) => {
    const newConditions = {}
    for (const key of Object.keys(conditions)) {
      if (_.isArray(conditions[key])) {
        // 如果是数组，比如说传过来的是 shopIds 则需要把shopId 转成 in 的查询条件
        // 但是有种特殊情况 比如既指定了 shopIds 又指定了 shopId 则以shopId为准
        const newKey = pluralize.singular(key)
        if (conditions[newKey]) {
          // 如果这个转为单数的key已经存在了，则原则上以这个存在的key为准
          if (conditions[key].filter(val => {
            return val === conditions[newKey]
          }).length > 0) {
            Object.assign(newConditions, { [newKey]: conditions[newKey] })
          } else {
            Object.assign(newConditions, { [newKey]: -999 })
          }
        } else {
          // 如果in中含有null, 则需要把null转化为 (key in [array] or key is null ) 这种形式
          if (_.indexOf(conditions[key], null) !== -1) {
            Object.assign(newConditions, {
              [Op.or]: [
                { [newKey]: { [Op.in]: conditions[key].filter(o => o !== null) } },
                {
                  [newKey]: {
                    [Op.eq]: null
                  }
                }
              ]
            })
          } else {
            Object.assign(newConditions, { [newKey]: { [Op.in]: conditions[key] } })
          }
        }
      } else if (conditions[key].operator) {
        Object.assign(newConditions,{[key]:{
          [Op[conditions[key].operator]] : conditions[key].value
        }})
      } else {
        // 如果不是数组，则直接转化为where条件
        if (conditions[key].indexOf(' - ') !== -1 || conditions[key].indexOf('+-+') !== -1) {
          conditions[key] = conditions[key].replace(/\+-\+/, ' - ')
          Object.assign(newConditions, {
            [key]: {
              $between: conditions[key].split(' - ')
            }
          })
        } else {
          Object.assign(newConditions, { [key]: conditions[key] })
        }
      }
    }
    return newConditions
  }

  // 把where中带.的提取出来, 这些where需要定义到include里面
  const getIncludeWhere = (where) => {
    const includeWhere = {}
    for (const key of _.keys(where)) {
      if (key.indexOf('.') !== -1) {
        includeWhere[key] = where[key]
      }
    }
    return includeWhere
  }
  // 提取不含.的where 也就是直接写在最外层的where
  const getOuterWhere = (where) => {
    const outerWhere = {}
    for (const key of _.keys(where)) {
      if (key.indexOf('.') === -1) {
        outerWhere[key] = where[key]
      }
    }
    return outerWhere
  }
    // 返回多层排序数组
    const getOrderCondition = (sortColumnlist) => {
      const orderby = []
      for (let v of sortColumnlist) {
        v = JSON.parse(v)
        // if (v.sort === 'desc') {
        //   orderby.push(`${v.col} ${v.sort} nulls last`)
        // } else {
        //   orderby.push(`${v.col} ${v.sort}`)
        // }
        orderby.push([v.col, v.sort])
      }
      return orderby
    }

  smartApi.getList = (Model, options = {}) => {
    return async (req, res, next) => {
      req.query = req.query || {}
      // 除了common字段，其他都添加到where条件中
      // TODO: nodejs现在不支持object 的rest parameter http://stackoverflow.com/questions/36666433/node-5-10-spread-operator-not-working
      // let {limit = 10, start = 0, sortColumn = 'createdAt', sortOrder = 'DESC', search, userId, ...where} = req.query
      let { limit = 200, start = 0, sortColumn = 'id', sortOrder = 'DESC', search } = req.query
      limit = parseInt(limit)
      start = parseInt(start)
      // 忽略common字段
      const originWhere = _.omit(req.query, ['limit', 'start', 'sortColumn', 'sortOrder', 'search', 'userId', 'roleId', 'secret'])
      // 把where中带.的param提取出来，这部分param需要放在include中去where
      const includeWhere = getIncludeWhere(originWhere)

      let where = getWhereCondition(getOuterWhere(originWhere))

      // 添加search字段
      where = Object.assign(where, getSearchCondition(options.searchColumns, search))

      // 定义scope
      const scope = getScope(options.scopes)

      // 定义include
      const include = getInclude(req, options.include, includeWhere)

      // 多列排序问题
      let orderarr = []
      if (_.isArray(sortColumn)) {
        orderarr = getOrderCondition(sortColumn)
      } else {
        orderarr = [[sortColumn, sortOrder]]
      }

      try {
        let entries = await models[Model].scope(scope).findAll({
          where,
          limit,
          offset: start,
          order: orderarr,
          include
        })

        if (options.cb) {
          entries = await options.cb(req, entries)
        }

        const totalRecords = await models[Model].scope(scope).count({
          where,
          include
        })

        res.json({ error: 0, data: entries, totalRecords: totalRecords })
      } catch (e) {
        next(e)
      }
    }
  }

  smartApi.get = (Model, options = {}) => {
    return async (req, res, next) => {
      const id = req.params.id
      // let enterpriseId = req.query.enterpriseId
      try {
        // 定义scope
        const scope = getScope(options.scopes)
        // 定义include
        const include = getInclude(req, options.include)
        const entry = await models[Model].scope(scope).findOne({
          where: {
            id
            // enterpriseId
          },
          include
        })
        if (entry) {
          if (options.cb) {
            await options.cb(req, res, entry)
          } else {
            res.json({
              error: 0, data: entry
            })
          }
        } else {
          res.json({ error: 404, data: {}, errorMsg: '无此记录' })
        }
      } catch (e) {
        next(e)
      }
    }
  }

  smartApi.post = (Model, options = {}) => {
    return async (req, res) => {
      // let enterpriseId = req.query.enterpriseId
      try {
        req.body = req.body || {}
        delete req.body.userId
        req.body = Object.assign(req.body, getAdditionalBody(req, options.additionalBody))
        // req.body.enterpriseId = enterpriseId
        let func = 'create'
        if (_.isArray(req.body)) {
          func = 'bulkCreate'
        }
        let entry = await models[Model][func](req.body)
        if (entry) {
          if (options.cb) {
            entry = await options.cb(req, entry)
          }
          res.json({ error: 0, data: entry })
        } else {
          res.json({ error: 404, data: {}, errorMsg: '插入失败' })
        }
      } catch (e) {
        res.json({ error: 500, errorMsg: '系统错误' + e })
      }
    }
  }

  smartApi.putStatus = (Model) => {
    return async (req, res) => {
      const id = req.params.id
      try {
        const status = req.body
        if (status === 'void') {
          await models[Model].update({ isEnable: false }, {
            where: {
              id
            }
          })
        } else if (status === 'accepted') {
          await models[Model].update({ isEnable: true }, {
            where: {
              id
            }
          })
        }
        res.json({
          error: 0
        })
      } catch (e) {
        res.json({
          error: 500,
          errorMsg: '系统错误'
        })
      }
    }
  }

  smartApi.delete = (Model, options = {}) => {
    return async (req, res, next) => {
      const id = req.params.id
      // let enterpriseId = req.query.enterpriseId
      try {
        const affectedRows = await models[Model].update({ isEnable: false }, {
        // let affectedRows = await req.app.locals.ERP[Model].delete({}, {
          where: {
            id
            // enterpriseId
          }
        })
        if (affectedRows && affectedRows[0] > 0) {
          res.json({ error: 0, data: { affectedRows: affectedRows[0] } })
        } else {
          res.json({ error: 404, errorMsg: '无此数据' })
        }
      } catch (e) {
        next(e)
      }
    }
  }

  smartApi.patch = (Model, options = {}) => {
    return async (req, res, next) => {
      const id = req.params.id
      // let enterpriseId = req.query.enterpriseId
      try {
        const affectedRows = await models[Model].update(req.body, {
          where: {
            id
            // enterpriseId
          }
        })
        if (affectedRows && affectedRows[0] > 0) {
          res.json({ error: 0, data: { affectedRows: affectedRows[0] } })
        } else {
          res.json({ error: 404, errorMsg: '无此数据' })
        }
      } catch (e) {
        next(e)
      }
    }
  }
  return smartApi
}
