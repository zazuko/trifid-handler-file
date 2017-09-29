const formats = require('rdf-formats-common')()
const fromFile = require('rdf-utils-fs/fromFile')
const rdf = require('rdf-ext')
const rdfBodyParser = require('rdf-body-parser')
const resourcesToGraph = require('rdf-utils-dataset/resourcesToGraph')
const JsonLdSerializer = require('rdf-serializer-jsonld-ext')

const jsonLdSerializer = new JsonLdSerializer({
  process: [
    {flatten: true},
    {compact: true},
    {outputFormat: 'string'}
  ]
})

formats.serializers['application/json'] = jsonLdSerializer
formats.serializers['application/ld+json'] = jsonLdSerializer

class FileHandler {
  constructor (options) {
    this.filename = options.filename
    this.split = options.split

    this.handle = this._handle.bind(this)

    // legacy interface
    this.get = this._get.bind(this)
  }

  _handle (req, res, next) {
    rdfBodyParser.attach(req, res, {formats: formats}).then(() => {
      return this.load()
    }).then(() => {
      const dataset = this.dataset.match(null, null, null, rdf.namedNode(req.iri))

      if (dataset.length === 0) {
        return next()
      }

      const graph = rdf.graph(dataset)

      res.graph(graph)
    }).catch(next)
  }

  // legacy interface
  _get (req, res, next, iri) {
    req.iri = iri

    this.handle(req, res, next)
  }

  load () {
    if (process.env.NODE_ENV !== 'development' && this.dataset) {
      return Promise.resolve()
    }

    return rdf.dataset().import(fromFile(this.filename)).then((input) => {
      if (this.split) {
        this.dataset = resourcesToGraph(input)
      } else {
        this.dataset = input
      }
    })
  }
}

module.exports = FileHandler
