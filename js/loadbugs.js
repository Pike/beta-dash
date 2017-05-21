var bzapi = 'https://bugzilla.mozilla.org/rest/';
jQuery.ajaxSettings.traditional = true;

function getComments(buglist, cont) {
  var bugs = {};
  $.each(buglist, function(i, bug) {
    bugs[bug.id] = bug;
  });
  var bug_ids = Object.keys(bugs);
  if (bug_ids.length === 0) {
    cont();
    return;
  }
  var bug = bug_ids.shift();
  var url = bzapi + 'bug/' + bug + '/comment', params = {};
  if (bug_ids.length) {
    params.ids = bug_ids;
  }
  var ch = function _commentHandler(data) {
    var items = [];
    $.each(data.bugs, function(bug_id, blob) {
      $.each(blob.comments, function(i, comment) {
      items.push({
        label: bug_id,
        id: bug_id + '_' + i,
        creation_time: comment.creation_time,
        creator: comment.creator.split('@')[0],
        locale: bugs[bug_id].loc,
        number: i,
        type: 'Comment'
      });
    });
    });
    exhibit.getDatabase().loadItems(items, url, cont);
  };
  $.getJSON(url, params, ch);
}

var Bugs = {
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
        bug.loc = self.loc || /\[([a-zA-Z\-]+)\]/.exec(bug.summary)[1];
        if (self.getdepends) {
          var bl = new _Loader(bug.id, self.db, _cont)
          bl.getdepends = false;
          bl.loc = bug.loc;
          this.pending++;
          bl.load();
        }
      });
      getComments(bugs, _cont);
      this.db.loadItems.call(this.db, items, this.url, this.doneLoad.bind(this));
    },
    doneLoad: function _ld() {
      this.pending--;
      if (this.pending == 0 && this.cont) this.cont();
    }
  };
  return _Loader;
})();

$(document).one("registerImporters.exhibit", function() {

Bugs.Importer = new Exhibit.Importer("application/x-blocking-bugs", "get", console.error.bind(console));

Bugs.Importer.load = function _loadbugs(link, database, cont) {
  function doneImporting() {
    Exhibit.UI.hideBusyIndicator();
    if (cont) cont();
  }
  var bl = new Bugs.Loader('585992', database, doneImporting);
  bl.load();
  Exhibit.UI.showBusyIndicator();
};
// XXX Hack
Timeline.DateTime = Exhibit.DateTime;
});
