module.exports = (sqlite, Sequelize) => {
    let course = sqlite.define('course', {
        name: {
            type: Sequelize.STRING(100),
            comment: 'course name'
        }
    })
    return course
}