var elasticsearch = require('elasticsearch');
/*
 * GET twitter stream.
 */

exports.stream = function(req, res){
  res.render('stream', { title: 'Demo' });
};

/*
 * Generate stats
 */
exports.stats = function(req, res){
    
  var client = new elasticsearch.Client({
    host: 'localhost:9200'
  });
  
  client.search({
    index: 'tweets',
    size: 0,
    body: {
      "query": {
        "match_all": {}
      },
      "facets": {
        "histo1": {
          "date_histogram": {
            "field": "created_at",
            "interval": "minute"
          }
        }
      },
      "size": 0
    }
  }, function (error, response) {
    console.info(response.facets.histo1.entries);
    res.render('stats', {"title": "Stats", "data": response.facets.histo1.entries});
  });

};