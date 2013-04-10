var bzapi = 'https://api-dev.bugzilla.mozilla.org/1.3/';

function getComments(bug, loc, cont) {
  var url = bzapi + 'bug/' + bug + '/comment';
  var ch = function _commentHandler(data) {
    var items = [];
    $.each(data.comments, function(i, comment) {
      items.push({
        label: bug,
        id: bug + '_' + i,
        creation_time: comment.creation_time,
        creator: comment.creator.name,
        locale: loc,
        number: i,
        type: 'Comment'
      });
    });
    exhibit.getDatabase().loadItems(items, url);
    if (cont) cont();
  };
  $.getJSON(url, ch);
}

var Bugs = {
  Importer: {}
};

Bugs.Loader = (function() {
  function _Loader(bug, db, cont) {
    this.bug = bug;
    this.url = bzapi + 'bug/' + bug;
    this.db = db;
    this.cont = cont;
    this.pending = 0;
    this.getdepends = true;
  }
  _Loader.prototype = {
    load: function _ll() {
      var self = this;
      this.pending++;
      $.getJSON(bzapi + "bug",
                {'blocks': this.bug,
                'resolution': '---',
                'include_fields': 'id,product,component,summary'},
                function(d) {self.onDepends(d);}
               );
    },
    onDepends: function _lod(data) {
      var bugs = data.bugs, items = [];
      var self = this;
      function _cont() {self.doneLoad();}
      $.each(bugs, function(i, bug) {
        items.push({
          label: bug.id,
          component: bug.component,
          summary: bug.summary,
          product: bug.product,
          keywords: bug.keywords,
          type: 'Bug'
        });
        if (self.getdepends) {
          var bl = new _Loader(bug.id, self.db, _cont)
          bl.getdepends = false;
          this.pending++;
          bl.load();
        }
        loc = /\[([a-zA-Z\-]+)\]/.exec(bug.summary)[1];
        getComments(bug.id, loc, _cont);
      });
      this.db.loadItems.call(this.db, items, this.url);
      this.doneLoad();
    },
    doneLoad: function _ld() {
      this.pending--;
      if (this.pending == 0 && this.cont) this.cont();
    }
  };
  return _Loader;
})();

Exhibit.importers["application/x-blocking-bugs"] = Bugs.Importer;

Bugs.Importer.load = function _loadbugs(link, database, cont) {
  function doneImporting() {
    Exhibit.UI.hideBusyIndicator();
    if (cont) cont();
  }
  var bl = new Bugs.Loader('585992', database, doneImporting);
  bl.load();
  Exhibit.UI.showBusyIndicator();
}
