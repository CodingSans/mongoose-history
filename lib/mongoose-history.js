'use strict';
const hm = require('./history-model');

module.exports = function historyPlugin(schema, options) {

  // Clear all history collection from Schema
  schema.statics.historyModel = function historyModel() {
    return hm.HistoryModel(`${this.collection.name}_history`, options);
  };

  // Clear all history documents from history collection
  schema.statics.clearHistory = function clearHistory(callback) {
    const History = hm.HistoryModel(`${this.collection.name}_history`, options);
    History.remove({}, function(err) {
      callback(err);
    });
  };

  schema.pre('save', function(next) {
    let d = this.toObject();
    d.__v = undefined;

    const historyDoc = {
      when: new Date(),
      operation: this.isNew ? 'insert': 'update',
      target: 'instance',
      data: d,
    };

    const HistoryModel = hm.HistoryModel(`${this.collection.name}_history`, options);
    const history = new HistoryModel(historyDoc);
    history.save(next);
  });

  schema.pre('remove', function(next) {
    let d = this.toObject();
    d.__v = undefined;

    const historyDoc = {
      when: new Date(),
      operation: 'remove',
      target: 'instance',
      data: d,
    };

    const HistoryModel = hm.HistoryModel(`${this.collection.name}_history`, options);
    const history = new HistoryModel(historyDoc);
    history.save(next);
  });
};
