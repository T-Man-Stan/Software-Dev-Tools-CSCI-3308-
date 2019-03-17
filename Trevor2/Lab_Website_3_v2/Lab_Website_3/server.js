/***********************
  Load Components!

  Express      - A Node.js Framework
  Body-Parser  - A tool to help use parse the data in a post request
  Pg-Promise   - A database tool to help use connect to our PostgreSQL database
***********************/
var express = require('express'); //Ensure our express framework has been added
var app = express();
var bodyParser = require('body-parser'); //Ensure our body-parser tool has been added
app.use(bodyParser.json());              // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//Create Database Connection
var pgp = require('pg-promise')();

/**********************
  Database Connection information
  host: This defines the ip address of the server hosting our database.  We'll be using localhost and run our database on our local machine (i.e. can't be access via the Internet)
  port: This defines what port we can expect to communicate to our database.  We'll use 5432 to talk with PostgreSQL
  database: This is the name of our specific database.  From our previous lab, we created the football_db database, which holds our football data tables
  user: This should be left as postgres, the default user account created when PostgreSQL was installed
  password: This the password for accessing the database.  You'll need to set a password USING THE PSQL TERMINAL THIS IS NOT A PASSWORD FOR POSTGRES USER ACCOUNT IN LINUX!
**********************/
const dbConfig = {
	host: 'localhost',
	port: 5432,
	database: 'football_db',
	user: 'postgres',
	password: 'moo'
}; 

var db = pgp(dbConfig);

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/'));//This line is necessary for us to use relative paths and access our resources directory


/*********************************
 Below we'll add the get & post requests which will handle:
   - Database access
   - Parse parameters from get (URL) and post (data package)
   - Render Views - This will decide where the user will go after the get/post request has been processed

 Web Page Requests:

  Login Page:        Provided For your (can ignore this page)
  Registration Page: Provided For your (can ignore this page)
  Home Page:
  		/home - get request (no parameters) 
  				This route will make a single query to the favorite_colors table to retrieve all of the rows of colors
  				This data will be passed to the home view (pages/home)

  		/home/pick_color - post request (color_message)
  				This route will be used for reading in a post request from the user which provides the color message for the default color.
  				We'll be "hard-coding" this to only work with the Default Color Button, which will pass in a color of #FFFFFF (white).
  				The parameter, color_message, will tell us what message to display for our default color selection.
  				This route will then render the home page's view (pages/home)

  		/home/pick_color - get request (color)
  				This route will read in a get request which provides the color (in hex) that the user has selected from the home page.
  				Next, it will need to handle multiple postgres queries which will:
  					1. Retrieve all of the color options from the favorite_colors table (same as /home)
  					2. Retrieve the specific color message for the chosen color
  				The results for these combined queries will then be passed to the home view (pages/home)

  		/team_stats - get request (no parameters)
  			This route will require no parameters.  It will require 3 postgres queries which will:
  				1. Retrieve all of the football games in the Fall 2018 Season
  				2. Count the number of winning games in the Fall 2018 Season
  				3. Count the number of lossing games in the Fall 2018 Season
  			The three query results will then be passed onto the team_stats view (pages/team_stats).
  			The team_stats view will display all fo the football games for the season, show who won each game, 
  			and show the total number of wins/losses for the season.

  		/player_info - get request (no parameters)
  			This route will handle a single query to the football_players table which will retrieve the id & name for all of the football players.
  			Next it will pass this result to the player_info view (pages/player_info), which will use the ids & names to populate the select tag for a form 
************************************/

// login page 
app.get('/', function(req, res) {
	res.render('pages/login',{
		local_css:"signin.css", 
		my_title:"Login Page"
	});
});

// registration page 
app.get('/register', function(req, res) {
	res.render('pages/register',{
		my_title:"Registration Page"
	});
});

// home page
app.get('/home', function(req, res) {
  var query = 'select * from favorite_colors;';
  db.any(query)
        .then(function (rows) {
          res.render('pages/home',{
            my_title: "Home Page",
            data: rows,
            color: '',
            color_msg: ''
          })
        })
        .catch(function (err) {
            // display error message in case an error
            request.flash('error', err);
            response.render('pages/home', {
                title: 'Home Page',
                data: '',
                color: '',
                color_msg: ''
            })
        })
});

app.post('/home/pick_color', function(req, res) {
  var color_hex = req.body.color_hex;
  var color_name = req.body.color_name;
  var color_message = req.body.color_message;
  var insert_statement = "INSERT INTO favorite_colors(hex_value, name, color_msg) VALUES('" + color_hex + "','" + 
              color_name + "','" + color_message +"') ON CONFLICT DO NOTHING;";

  var color_select = 'select * from favorite_colors;';
  db.task('get-everything', task => {
        return task.batch([
            task.any(insert_statement),
            task.any(color_select)
        ]);
    })
    .then(info => {
      res.render('pages/home',{
        my_title: "Home Page",
        data: info[1],
        color: color_hex,
        color_msg: color_message
      })
    })
    .catch(error => {
        // display error message in case an error
            request.flash('error', err);
            response.render('pages/home', {
                my_title: 'Home Page',
                data: '',
                color: '',
                color_msg: ''
            })
    });
});

app.get('/home/pick_color', function(req, res) {
  var color_choice = req.query.color_selection;
  var color_options =  'select * from favorite_colors;';
  var color_message = "select color_msg from favorite_colors where hex_value = '" + color_choice + "';"; 
  db.task('get-everything', task => {
        return task.batch([
            task.any(color_options),
            task.any(color_message)
        ]);
    })
    .then(info => {
      res.render('pages/home',{
        my_title: "Home Page",
        data: info[0],
        color: color_choice,
        color_msg: info[1][0].color_msg
      })
    })
    .catch(error => {
        // display error message in case an error
            request.flash('error', err);
            response.render('pages/home', {
                title: 'Home Page',
                data: '',
                color: '',
                color_msg: ''
            })
    });  
});

// team_stats page 
app.get('/team_stats', function(req,res){
  var games = 'select * from football_games;';
  var count = 'select count(*) from football_games;';
  db.task('get-everything', task => {
      return task.batch([
          task.any(games),
          task.any(count)
      ]);
  })
  .then(data => {
    res.render('pages/team_stats',{
        my_title:"Team Stats",
        games: data[0],
        count: data[1]
      })
  })
  .catch(err => {
        console.log('Oh noooo ', err);
        // req.flash('error', err);
        res.render('pages/team_stats',{
        my_title: "Team Stats",
        games: '',
        count: ''
      })
  });
});

// player_info page
app.get('/player_info', function(req,res){
  var players = 'select * from football_players;';
  db.task('get-everything', task => {
      return task.batch([
          task.any(players)
      ]);
  })
  .then(data => {
    res.render('pages/player_info',{
        my_title:"Player Info",
        players: data[0],
        player_info: '',
        games_played: ''
      })
  })
  .catch(err => {
        console.log('error will robinson!');
        req.flash('error', err);
        res.render('pages/player_info',{
        my_title: "Player Info",
        players: '',
        player_info: '',
        games_played: ''
      })
  });
});

// app.get('/player_info/post', function(req,res){
//   var playerC = req.query.playerC; 
//   var chosen_players = "select * from football_players where id = '" + playerC + "';";
//   var listplayers = 'select * from football_players;' ;
//   var gamesplayed = "select count(*) from football_games where " + playerC + "any(players);";
//   //var info = 'select * from football_players where id =' playerC+';';
//   //var gamesPlayed = "select count(*) from football_games where " + player_selection + " in players;";
//   //db.any(player)
//   db.task('get-everything', task => {
//         return task.batch([
//             task.any(chosen_players),
//             task.any(listplayers),
//             task.any(games)
//         ]);
//     })
//     .then(data => {
//       //console.log('on the    server ')
//       //console.log(data[0])
//       //console.log(data[1])
//       res.render('pages/player_info',{
//         my_title:"Player Info",
//         playerinfo: data[0][0],
//         players: data[1],
//         gamesplayed: data[2]
//         //gamesPlayed: data[1],
//         //p2: data[2]
//         //players: data[1]
//       })
//   })
//   .catch(err => {
//         console.log('Uh Oh try again!', players);
//       console.log('error', err);
//         res.render('pages/player_info',{
//         my_title: "Player Info",
//         playerinfo: '',
//         //gamesPlayed: '',
//         players: '',
//         gamesplayed: ''
//       })
//   });
// });

app.get('/player_info/post', function(req, res) {
  var player_id = req.query.playerC;
  var list_players = 'select id, name from football_players;';
  var chosen_player = 'select * from football_players where id=' + player_id + ';';
  var games_played = 'select count(*) from football_games where ' + player_id + '=any(players);';

   db.task('get-everything', task => {
        return task.batch([
            task.any(list_players),
            task.any(chosen_player),
            task.any(games_played)
        ]);
    })
    .then(data => {
      console.log(data[1])
      res.render('pages/player_info',{
        my_title: "Football Games",
        players: data[0],
        player_info: data[1][0],
        games_played: data[2][0].count
      })
    })
    .catch(error => {
        // display error message in case an error
            request.flash('error', err);
            response.render('pages/player_info', {
                title: 'Football Player Information',
                players: '',
                player_info: '',
                games_played: ''
            })
    });
  
});

app.listen(3000);
console.log('3000 is the magic port');
