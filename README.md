# trifid-handler-file

Handler for Trifid which reads the data from a single file on the local file system.

## Usage

Add the `trifid-handler-file` package to your dependencies:

    npm install trifid-handler-file --save

Change the `handler` property in the config like in the example below and adapt the options. 

## Example

This example config uses [The Big Bang Theory dataset](https://www.npmjs.com/package/tbbt-ld/):

```
{
  "baseConfig": "trifid:config.json",
  "handler": {
    "module": "trifid-handler-file",
    "options": {
      "filename": "tbbt-ld/dist/tbbt.nt",
      "split": true
    }
  }
}
```

## Options

- `filename`: Path to the filename which contains the dataset
- `split`: If true, the dataset will be split into subgraphs for each Named Node
