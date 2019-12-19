module.exports = (sqlite, Sequelize) => {
    const classes = sqlite.define('classes', {
      name: {
        type: Sequelize.STRING(40),
        comment: 'classes\'s name'
      }
    })
    return classes
  }
  