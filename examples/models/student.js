module.exports = (db, Sequelize) => {
  const student = db.define('student', {
    name: {
      type: Sequelize.STRING(40),
      comment: 'student\'s name'
    },
    birthDate: {
      type: Sequelize.STRING(10),
      comment: 'birth date as a format YYYY-MM-DD'
    }
  })

  student.associate = (models) => {
    student.belongsTo(models.class)
  }

  return student
}
