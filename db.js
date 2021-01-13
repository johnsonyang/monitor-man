const Sequelize = require('sequelize');

const appLogger = require('./server/util/log').get('mysql')

const FilmModel = require('./models/films');
const UserModel = require('./models/users');

const sequelize = new Sequelize('sequelize_js_test', 'johnson', 'Johnson@1234', {
    host: '10.211.55.5',
    dialect: 'mysql'
});

const Film = FilmModel(sequelize, Sequelize);
const User = UserModel(sequelize, Sequelize);

sequelize.sync({force:false})
.then(()=>{
    appLogger.info('Tablas sincronizadas.');
})

module.exports = {
    Film,
    User
}