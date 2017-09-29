/* global describe, it */

const assert = require('assert')
const express = require('express')
const fs = require('fs')
const request = require('supertest')
const url = require('url')
const Handler = require('..')

describe('trifid-handler-file', () => {
  const filenameGraph = require.resolve('tbbt-ld/dist/tbbt.nt')
  const filenameDataset = require.resolve('tbbt-ld/dist/tbbt.nq')
  const attachIri = (req, res, next) => {
    req.iri = url.resolve('http://localhost:8080/', decodeURI(req.url))

    next()
  }

  it('should be a constructor', () => {
    assert.equal(typeof Handler, 'function')
  })

  it('should implement the handler interface', () => {
    const handler = new Handler({filename: filenameDataset})

    assert.equal(typeof handler.handle, 'function')
  })

  it('should implement the legazy handler interface', () => {
    const handler = new Handler({filename: filenameDataset})

    assert.equal(typeof handler.get, 'function')
  })

  it('should load a dataset input file', () => {
    const handler = new Handler({filename: filenameDataset})

    return handler.load().then(() => {
      const graphs = handler.dataset.toArray().reduce((graphs, quad) => {
        graphs[quad.graph.value] = true

        return graphs
      }, {})

      assert(graphs['http://localhost:8080/data/person/amy-farrah-fowler'])
      assert(graphs['http://localhost:8080/data/person/sheldon-cooper'])
    })
  })

  it('should load and split a graph input file', () => {
    const handler = new Handler({
      filename: filenameGraph,
      split: true
    })

    return handler.load().then(() => {
      const graphs = handler.dataset.toArray().reduce((graphs, quad) => {
        graphs[quad.graph.value] = true

        return graphs
      }, {})

      assert(graphs['http://localhost:8080/data/person/amy-farrah-fowler'])
      assert(graphs['http://localhost:8080/data/person/sheldon-cooper'])
    })
  })

  it('should send a response', () => {
    const includeNt = '<http://localhost:8080/data/person/amy-farrah-fowler><http://www.w3.org/1999/02/22-rdf-syntax-ns#type><http://schema.org/Person>.'
    const excludeNt = '<http://localhost:8080/data/person/sheldon-cooper><http://www.w3.org/1999/02/22-rdf-syntax-ns#type><http://schema.org/Person>.'

    const app = express()

    const handler = new Handler({filename: filenameDataset})

    app.use(attachIri)
    app.use(handler.handle)

    return request(app)
      .get('/data/person/amy-farrah-fowler')
      .set('accept', 'text/turtle')
      .then((res) => {
        const text = res.text.split(' ').join('')

        assert.notEqual(text.indexOf(includeNt), -1)
        assert.equal(text.indexOf(excludeNt), -1)
      })
  })

  it('should handle unicode characters', () => {
    const app = express()

    const handler = new Handler({
      filename: 'test/support/unicode.ttl',
      split: true
    })

    app.use(attachIri)
    app.use(handler.handle)

    return request(app)
      .get('/%C3%BCmlaut')
      .set('accept', 'text/turtle')
      .expect(200)
  })

  it('should compact JSON-LD responses', () => {
    const app = express()

    const handler = new Handler({filename: filenameDataset})

    app.use(attachIri)
    app.use(handler.handle)

    return request(app)
      .get('/data/person/amy-farrah-fowler')
      .set('accept', 'application/ld+json')
      .then((res) => {
        const jsonld = JSON.parse(res.text)

        assert(!Array.isArray(jsonld))
        assert.equal(jsonld['@id'], 'http://localhost:8080/data/person/amy-farrah-fowler')
        assert.equal(jsonld['http://schema.org/givenName'], 'Amy')
      })
  })

  it('should send a 404 response for unknown resources', () => {
    const app = express()

    const handler = new Handler({filename: filenameDataset})

    app.use(attachIri)
    app.use(handler.handle)

    return request(app)
      .get('/data/person/dr-who')
      .set('accept', 'text/turtle')
      .expect(404)
  })

  it('should cache the dataset', () => {
    const base = 'http://localhost:8080'
    const filename = 'test.nt'

    const datasetBefore =
      `<${base}/subject0> <${base}/predicate> "object0" .\n<${base}/subject1> <${base}/predicate> "object1" .\n`

    const datasetAfter =
      `<${base}/subject0> <${base}/predicate> "object0" .\n<${base}/subject0> <${base}/predicate> "object1" .\n`

    const app = express()

    const handler = new Handler({
      filename: filename,
      split: true
    })

    app.use(attachIri)
    app.use(handler.handle)

    fs.writeFileSync(filename, datasetBefore)

    process.env.NODE_ENV = 'production'

    return request(app)
      .get('/subject1')
      .set('accept', 'text/turtle')
      .expect(200)
      .then(() => {
        fs.writeFileSync(filename, datasetAfter)

        return request(app)
          .get('/subject1')
          .set('accept', 'text/turtle')
          .expect(200)
      })
  })

  it('should not cache the dataset in development env', () => {
    const base = 'http://localhost:8080'
    const filename = 'test.nt'

    const datasetBefore =
      `<${base}/subject0> <${base}/predicate> "object0" .\n<${base}/subject1> <${base}/predicate> "object1" .\n`

    const datasetAfter =
      `<${base}/subject0> <${base}/predicate> "object0" .\n<${base}/subject0> <${base}/predicate> "object1" .\n`

    const app = express()

    const handler = new Handler({
      filename: filename,
      split: true
    })

    app.use(attachIri)
    app.use(handler.handle)

    fs.writeFileSync(filename, datasetBefore)

    process.env.NODE_ENV = 'development'

    return request(app)
      .get('/subject1')
      .set('accept', 'text/turtle')
      .expect(200)
      .then(() => {
        fs.writeFileSync(filename, datasetAfter)

        return request(app)
          .get('/subject1')
          .set('accept', 'text/turtle')
          .expect(404)
      })
  })

  it('should implement the legacy interface', () => {
    const app = express()

    const handler = new Handler({filename: filenameDataset})

    app.use(attachIri)
    app.use((req, res, next) => {
      handler.get(req, res, next, req.iri)
    })

    return request(app)
      .get('/data/person/amy-farrah-fowler')
      .set('accept', 'text/turtle')
      .expect(200)
  })
})
