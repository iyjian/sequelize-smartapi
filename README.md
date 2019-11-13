

getList 支持 in

for example:

http://localhost:3000/users?groupId=[1, 2, null]

this will change the query to:

select * from users where groupId in (1, 2) or groupId is null;
