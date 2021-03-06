var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./gene.iobio.db');
var express = require('express');
var app = express();
var async = require('async');

app.use(express.static(__dirname ));

app.get('/', function (req, res) {  
  res.sendFile(path.join(__dirname,'index.html'));
})

app.get('/:toSearch', function (req, res) {  
  res.sendFile(path.join(__dirname,'index.html'));
})

app.get('/api/gene/:gene', function (req, res) {  
  var source = req.query.source;
  var species = req.query.species;
  var build = req.query.build;
  if (source == null || source == '') {
    source = 'gencode';
  } 
  var geneSqlString = "SELECT * from genes where gene_name like \""+req.params.gene+"\" ";
  geneSqlString    += " AND source = \""+source+"\"";
  if (species != null && species != "") {
    geneSqlString  += " AND species = \""+species+"\"";
  }
  if (build != null && build != "") {
    geneSqlString  += " AND build = \""+build+"\"";
  }

  db.all(geneSqlString,function(err,rows){ 
    var gene_data = {};
    var transcript_ids = [];
    if (rows != null && rows.length > 0) {
      for (var i = 0; i < rows.length; i++) {
        gene_data = rows[i];    
        if (gene_data.hasOwnProperty("transcripts") && gene_data.transcripts != null && gene_data.transcripts != "") {
          transcript_ids = transcript_ids.concat(JSON.parse(gene_data['transcripts']));
        }       
      }
    } 

    var sqlString  = "SELECT t.* from transcripts t ";
    var sqlString  = "SELECT t.*, x.refseq_id as 'xref' from transcripts t ";
    sqlString     += "LEFT OUTER JOIN xref_transcript x on x.gencode_id = t.transcript_id ";
    sqlString     += "WHERE t.gene_name=\""+req.params.gene+"\" "
    sqlString     += "AND t.source = \""+source+"\"";
    if (species != null && species != "") {
      sqlString  += " AND t.species = \""+species+"\"";
    }
    if (build != null && build != "") {
      sqlString  += " AND t.build = \""+build+"\"";
    }            

    db.all(sqlString,function(err,transcriptRows){ 
      var transcripts = [];
      var transcript = {};
      if (transcriptRows != null && transcriptRows.length > 0) {
        for (var i = 0; i < transcriptRows.length; i++) {
          transcript = transcriptRows[i];    
          transcript['features'] = JSON.parse(transcript['features']);
          transcripts.push(transcript);
        }
      }
      gene_data["transcripts"] = transcripts;

      res.header('Content-Type', 'application/json');
      res.header('Charset', 'utf-8')
      res.send(req.query.callback + '(' + JSON.stringify([gene_data]) +');');
    });
  });
});

app.get('/api/region/:region', function (req, res) {  
  var chr = req.params.region.split(':')[0].toLowerCase();
  var start = req.params.region.split(':')[1].split('-')[0];
  var end = req.params.region.split(':')[1].split('-')[1];
  var source = req.query.source; 
  var species = req.query.species;
  var build = req.query.build;
  if (source == null || source == '') {
    source = 'gencode';
  } 
  var sqlString = "SELECT * from genes where chr = '" + chr 
    + "' and  (start between " + start + " and " + end 
    + "        or end between " + start + " and " + end + ")";
  sqlString     += "AND source = \""+source+"\"";
  if (species != null && species != "") {
    sqlString  += " AND species = \""+species+"\"";
  }
  if (build != null && build != "") {
    sqlString  += " AND build = \""+build+"\"";
  }  
  db.all(sqlString, function(err, genes) {  
    
    async.map(genes, 
      function(gene_data, outterDone) {                   
        var transcript_ids = JSON.parse(gene_data['transcripts']);
    
        async.map(transcript_ids,      
          function(id, done){      
            var sqlString = "SELECT * from transcripts t ";
            if (source == 'gencode') {
              sqlString +=    "LEFT OUTER JOIN xref_transcript x on x.gencode_id = t.transcript_id ";
            } else if (source == 'refseq') {
              sqlString +=    "LEFT OUTER JOIN xref_transcript x on x.refseq_id = t.transcript_id ";
            }
            sqlString +=    "WHERE t.transcript_id=\""+id+"\" "
            sqlString +=    "AND t.source = \""+source+"\"";          
            if (species != null && species != "") {
              sqlString  += " AND t.species = \""+species+"\"";
            }
            if (build != null && build != "") {
              sqlString  += " AND t.build = \""+build+"\"";
            }  
            db.all(sqlString,function(err,rows){          
              rows[0]['features'] = JSON.parse(rows[0]['features']);
              done(null,rows[0]);
            });
          },      
          function(err, results){        
            gene_data['transcripts'] = results;            
            outterDone(null, gene_data);
          }
        );
      },
      function(err, results) {                
        res.json(results);
      }
    );
  }); 
});

var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)

})