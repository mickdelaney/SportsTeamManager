var minode = require("./lib/minode");
var nodemailer = require("nodemailer");
var parseURL = minode.utils.parseURL;
var HTTPServer = minode.http.Server;
var config = {
  httpd: {
    host: "0.0.0.0",
    port: 80
  }
};
/*
setInterval(function() {
  global.now = new Date();
}, 1000);
*/
var db = {
  now: new Date("2013-10-28 20:00"),
  games: [{
    title: "Old Street, Wednesday",
    location: "Finsbury Leisure Centre, Old Street",
    id: "00000001",
    when: "Wednesday 8.30pm",
    map: "http://goo.gl/maps/YImOx",
    next: new Date("2013-10-30 20:30"),
    state: 0,
    size: 4,
    email: {
      type: "SMTP",
      from: "apjohnsto@gmail.com",
      config: {
        service: "Gmail",
        auth: {
          user: "apjohnsto@gmail.com",
          pass: "yavspgzqeqcjesga"
        }
      }
    },
    //todo: credits
    members: [
      {id: "0001", email: "billywhizz@outlook.com", name: "Player 1", prepay: false, admin: false},
      {id: "0002", email: "billywhizz@outlook.com", name: "Player 2", prepay: true, admin: true},
      {id: "0003", email: "billywhizz@outlook.com", name: "Player 3", prepay: true, admin: false},
      {id: "0004", email: "billywhizz@outlook.com", name: "Player 4", prepay: true, admin: false},
      {id: "0005", email: "billywhizz@outlook.com", name: "Player 5", prepay: true, admin: false},
      {id: "0006", email: "billywhizz@outlook.com", name: "Player 6", prepay: false, admin: false},
      {id: "0007", email: "billywhizz@outlook.com", name: "Player 7", prepay: false, admin: false},
      {id: "0008", email: "billywhizz@outlook.com", name: "Player 8", prepay: false, admin: false}
    ],
    archive: []
  }]
};
function Game(game) {
  var _game = this;
  var email = game.email;
  var transport = nodemailer.createTransport(email.type, email.config);
  this.invite = function() {
    game.members.forEach(function(member) {
      if(!member.invited) {
        transport.sendMail({
          from: email.from,
          to: member.email,
          subject: "Game Invite - " + game.title + " for " + member.name,
          html: [
            "<p>You have been invited to the following game:</p>",
            "<h2>@ " + game.location + " - " + game.when + "</h2>",
            "<p>Please click on the links below to accept or decline your invitation.</p>",
            "<p><a href=\"http://icms.owner.net/game/" + game.id + "/accept/" + member.id + "\">Accept</a>&nbsp;|&nbsp;<a href=\"http://icms.owner.net/game/" + (game.id + game.next.getTime()) + "/decline/" + member.id + "\">Decline</a></p>",
            game.map?"<p><a href=\"" + game.map + "\">map</a></p>":""
          ].join()
        }, function(err, status) {
          if(err) return console.error(err);
          //TODO: retry??
          //TODO: handle this properly
          member.invited = true;
          //transport.close();
        });
      }
    });
    game.state = 1;
  };
  this.remind = function(message) {
    var available = game.size - game.players;
    game.members.forEach(function(member) {
      if(!member.accepted && !member.rejected) {
        transport.sendMail({
          from: email.from,
          to: member.email,
          subject: "Game Reminder - " + game.title + " for " + member.name,
          html: [
            "<h2>@ " + game.location + " - " + game.when + "</h2>",
            "<p>There " + (available>1?"are":"is") + " still <em>" + available + "</em> place" + (available>1?"s":"") + " available</p>",
            "<p>Please click on the links below to accept or decline your invitation.</p>",
            "<p><a href=\"http://icms.owner.net/game/" + game.id + "/accept/" + member.id + "\">Accept</a>&nbsp;|&nbsp;<a href=\"http://icms.owner.net/game/" + (game.id + game.next.getTime()) + "/decline/" + member.id + "\">Decline</a></p>",
            game.map?"<p><a href=\"" + game.map + "\">map</a></p>":""
          ].join()
        }, function(err, status) {
          if(err) return console.error(err);
          //TODO: handle this properly
          member.reminder = true;
          //transport.close();
        });
      }
    });
    game.state = 2;
  };
  this.finalize = function(message) {
    var available = game.size - game.players;
    game.members.forEach(function(member) {
      if(member.accepted) {
        transport.sendMail({
          from: email.from,
          to: member.email,
          subject: "Game Lineup - " + game.title,
          html: [
            "<h2>@ " + game.location + " - " + game.when + "</h2>",
            "<p>There " + (available>1?"are":"is") + " still <em>" + available + "</em> place" + (available>1?"s":"") + " available</p>",
            "<p>Please click on the links below to accept or decline your invitation.</p>",
            "<p><a href=\"http://icms.owner.net/game/" + (game.id + game.next.getTime()) + "/accept/" + member.id + "\">Accept</a>&nbsp;|&nbsp;<a href=\"http://icms.owner.net/game/" + (game.id + game.next.getTime()) + "/decline/" + member.id + "\">Decline</a></p>",
            game.map?"<p><a href=\"" + game.map + "\">map</a></p>":""
          ].join()
        }, function(err, status) {
          if(err) return console.error(err);
          //TODO: handle this properly
          member.picked = true;
          //transport.close();
        });
      }
    });
    game.state = 2;
  };
  this.archive = function() {
    game.archive.push(JSON.parse(JSON.stringify(game)));
    game.state = 0;
    game.next = game.next.setDate(game.next.getDate() + 7);
    game.members = game.members.map(function(m) {
      return {
        email: m.email,
        name: m.name,
        prepay: m.prepay,
        admin: m.admin
      };
    });
  };
  function cycle() {
    var diff = Math.floor((game.next.getTime() - db.now.getTime())/1000);
    console.log("diff: " + diff);
    game.players = 0;
    game.members.forEach(function(member) {
      if(member.accepted) game.players++;
    });
    console.log("players: " + game.players);
    switch(game.state) {
      case 0:
        if(diff < (3600*72)) {
          _game.invite();
        }
        break;
      case 1: // reminder
        if(diff < (3600*32)) {
          if((game.players < game.size)) {
            _game.remind();
          }
          else {
            game.state = 2;
          }
        }
        break;
      case 2:
        if(diff < 0) {
          _game.archive();
        }
        break;
    }
    setTimeout(cycle, 1000 * 5);
  }
  this.cycle = cycle;
  cycle();
}
db.games.forEach(function(g) {
  g.controller = new Game(g);
});
//var repl = require("repl");
//repl.start("> ").context.db = db;
var rc;
var httpd;
var index = require("fs").readFileSync("./index.html");
index = [new Buffer("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: " + index.length + "\r\n\r\n"), index];
function httpHandler(peer) {
  peer.onRequest = function(request) {
    request.url = parseURL(request.url, true);
    console.log(request);
    var parts = request.url.pathname.split("/");
    var game = {};
    switch(parts[1]) {
      case "":
        break;
      case "favicon.ico":
        return true;
        break;
      case "index.html":
        var r = peer.send(index, function(status, handle, req) {
          if(status !== 0) {
            console.log("send: " + status);
            peer.kill();
          }
        });
        if(!r) {
          console.error("write failed");
          return false;
        }
        return true;
        break;
      case "game":
        if(parts.length > 2) {
          game.id = parts[2];
          if(parts.length > 3) {
            game.action = parts[3];
            switch(game.action) {
              case "accept":
              case "decline":
                if(parts.length > 4) {
                  game.member = parts[4];
                  console.log(game);
                  var g = db.games.filter(function(g) {
                    return g.id === game.id;
                  });
                  if(g.length === 0) return false;
                  g = g[0];
                  if(g.state < 1) return false; //TODO
                  var diff = Math.floor((g.next.getTime() - db.now.getTime())/1000);
                  if(diff < 3600) return false; // TODO
                  //TODO: use .some instead of .filter
                  var m;
                  g.members.some(function(mo) {
                    if(mo.id === game.member) {
                      m = mo;
                      return true;
                    }
                  });
                  if(game.action === "accept") {
                    m.accepted = true;
                    m.rejected = false;
                    //TODO: json message
                    var b = new Buffer([
                      "HTTP/1.1 200 OK",
                      "Content-Length: 0"
                    ].join("\r\n") + "\r\n\r\n");
                    var r = peer.send(b, function(status, handle, req) {
                      if(status !== 0) {
                        console.log("send: " + status);
                        peer.kill();
                      }
                    });
                    if(!r) {
                      console.error("write failed");
                      return false;
                    }
                  }
                  else if(game.action === "decline") {
                    m.accepted = false;
                    m.rejected = true;
                    var b = new Buffer([
                      "HTTP/1.1 200 OK",
                      "Access-Control-Allow-Origin: *",
                      "Content-Length: 0"
                    ].join("\r\n") + "\r\n\r\n");
                    var r = peer.send(b, function(status, handle, req) {
                      if(status !== 0) {
                        console.log("send: " + status);
                        peer.kill();
                      }
                    });
                    if(!r) {
                      console.error("write failed");
                      return false;
                    }
                  }
                  else {
                    return false;
                  }
                  return true;
                }
                else {
                  // bad request
                  return false;
                }
                break;
              case "finish":
                break;
              default:
                return false;
                break;
            }
          }
          else {
            // game details
            //TODO: use .some
            var payload = new Buffer(JSON.stringify(db.games.filter(function(g) {
              return game.id === g.id;
            })));
            var b = new Buffer([
              "HTTP/1.1 200 OK",
              "Content-Length: " + payload.length,
              "Access-Control-Allow-Origin: *",
              "Content-Type: application/json"
            ].join("\r\n") + "\r\n\r\n");
            var r = peer.send([b,payload], function(status, handle, req) {
              if(status !== 0) {
                console.log("send: " + status);
                peer.kill();
              }
            });
            if(!r) {
              console.error("write failed");
            }
            return true; // Hmmmm....
          }
        }
        else {
          // bad request
          // all games
          var payload = new Buffer(JSON.stringify(db.games));
          var b = new Buffer([
            "HTTP/1.1 200 OK",
            "Content-Length: " + payload.length,
            "Access-Control-Allow-Origin: *",
            "Content-Type: application/json"
          ].join("\r\n") + "\r\n\r\n");
          var r = peer.send([b,payload], function(status, handle, req) {
            if(status !== 0) {
              console.log("send: " + status);
              peer.kill();
            }
          });
          if(!r) {
            console.error("write failed");
          }
          return true; // Hmmmm....
        }
        break;
      default:
        return false;
        break;
    }
  };
  peer.onError = function(err) {
    console.error(err);
    console.trace("peer.onError");
  };
}
httpd = new HTTPServer(config.httpd);
httpd.onConnection = httpHandler;
httpd.onError = function(err) {
  console.error(err);
  console.trace("httpd.onError");
};
rc = httpd.listen(4096);
if(rc !== 0) {
  process.exit(1);
}