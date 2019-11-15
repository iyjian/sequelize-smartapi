

getList 支持 in

for example:

http://localhost:3000/users?groupId=[1, 2, null]

this will change the query to:

select * from users where groupId in (1, 2) or groupId is null;

## 安装：
```
npm install sequelize-smartapi --save
```
## Node.js
```
// models是通过sequelize模块创建的一系列model对象
const models = require('./models')
const smartApi = require('sequelize-smartapi')(models)
```
## 参数说明：
|名称|是否必填|类型|说明|适用的方法|
|--|--|--|--|--|
|Model| 必填| string类型|model对象的名字|post，get，getList，patch，delete，putStatus|
|options| 选填|Object类型|
|option.cb|选填| function (req,entry) |对从数据库获得的实例数据进行处理之后再返回，entry为实例数据|post，get，getList｜
|options.scopes|选填|Object，{name: 'columnName'}|主要用于界定从数据库返回的模型实例的值的范围,eg:smartApi.get('model',{scopes:{name:'isEnable'}}),表示查询有效的数据|get,getList|
|options.include|选填|Object,[{model:'modelName'}]|用来进行表的join,多个表join要进行嵌套|get,getList|
|options.searchColumns|选填|Array类型（待定，因为没有使用过，不确定，哈哈哈）|指定页面传入的搜索关键词所适用的列|getList|




## post - 新增数据，可以处理一个实例对象或包含多个实例对象的数组
```
post(Model, options={})

返回的res有三种情况：
{error:0,data:entry}，表示新增成功，entry返回新建的数据
{error: 404, data:{}, errorMsg: '添加数据失败'}，表示没有新建数据或者数据添加失败
{error：500，errorMsg：‘系统错误’}，表示代码异常
```

## get - 通过指定的主键id查询对应的数据
```
get(Model, options={})

通过指定的主键id查询对应的数据

返回的res有两种情况：
{error: 0, data: entry}　返回查询结果
{error: 404, data: {}, errorMsg: '无此记录'}
```

## getList -查询数据
```
getList(Model, options={})

根据传入的参数条件，返回对应的所有数据，默认无参数时查询整个表数据

返回：
{error: 0, data: entries, totalRecords: totalRecords}
entries:查询到的所有数据
totalRecords：查询到的数据量

```

## patch - 通过指定的主键id更新对应的数据
```
patch(Model, option={})

返回的res有两种情况：
{error: 404, errorMsg: '无此数据'}
{error: 0, data: {affectedRows: affectRows}, 返回影响的行数
```

## delete - 通过指定的主键ｉｄ删除对应的数据
```
delete(Model,options={})

删除操作并没有真实的删除数据库表中的数据，只是将表中的isEnable更新为false，即无效不可用，实现理论上的删除

返回的res有两种情况：
{error: 404, errorMsg: '无此数据'}
{error: 0, data: {affectedRows: affectRows}, 返回影响的行数
```

## putStatus - 更新状态（待补充）