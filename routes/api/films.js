// const router = require('express').Router();
const router = new (require('koa-router'))(/*{prefix: '/express'}*/)
const { Film } = require('../../db');
// http://localhost:3000/api/films/
router.get('/', async (req, res) => {
    console.log(req.usuarioId);
    const films = await Film.findAll();
    res.json(films);
});
// http://localhost:3000/api/films/
router.post('/', async (req, res) => {
    const film = await Film.create(req.body);
    res.json(film);
});

router.put('/:filmId', async (req, res) => {
    await Film.update(req.body, {
        where: { id: req.params.filmId }
    });
    res.json({success: 'Se ha modificado la pelicula'})
});

router.delete('/:filmId', async (req, res) => {
    await Film.destroy({
        where: {id: req.params.filmId}
    });
    res.json({success:'Pelicula Eliminada con exito!'})
});

module.exports = router;