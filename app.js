
/**
 * Module dependencies.
 */

var express = require('express')
  , path = require('path')
  , moment = require('moment')
  , twitter = require('ntwitter')
  , app = express()
  , io = require('socket.io')
  , server = require('http').createServer(app)
  , io = io.listen(server)
  , elasticsearch = require('elasticsearch')
  , routes = require('./routes')
  , tweets = require('./routes/tweets')
  , common = require('./keys')
  , global_socket, global_stream, client;


var client = new elasticsearch.Client({
  host: 'localhost:9200'
});

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express['static'](path.join(__dirname, 'public')));
  app.use(express.logger('dev'));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);
app.get('/stream', tweets.stream);
app.get('/stats', tweets.stats);



var twit = new twitter({
  consumer_key: common.keys.consumer_key,
  consumer_secret: common.keys.consumer_secret,
  access_token_key: common.keys.access_token_key,
  access_token_secret: common.keys.access_token_secret 
});


function emitTweet(data){
  global_socket.emit('tweet', data);
}


function saveIntoElasticSearch(aTweet, callback){
	var myKey = aTweet.id_str;
	var myDate = moment(aTweet.created_at);
	aTweet.created_at = myDate;
	
	client.index({
    index: 'tweets',
    type: 'tweet',
    id: myKey,
    body: aTweet
  }, function (err, resp) {
    console.info(err);
    console.info(resp);
    if(!err){
			callback(aTweet);
		}
  });

}


/* Socket.io config */
io.sockets.on('connection', function (socket) {
  global_socket = socket;
  
  // Set up events on socket
  // Start
  global_socket.on('start', function(socket) {
    /*
    twit.search('hardlifeofapo', {}, function(err, data){
      console.info(err);
      for(var index in data.statuses)
      saveIntoElasticSearch(data.statuses[index], emitTweet);
    });
    */
    twit.stream('statuses/sample', {"language": "es"},  function(stream) {
      global_stream = stream;
      stream.on('error', function(a,b){
				console.error(a);
				console.error(b);
			});
			stream.on('data', function (data) {
        saveIntoElasticSearch(data, emitTweet);
      });
    });

  });
  
  // Stop
  global_socket.on('stop', function(socket) {
   global_stream.destroy();
  });
});


/* Run server  */
server.listen(3000);