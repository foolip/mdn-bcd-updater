var instances = {
  AbortController: function() {
    return new AbortController();
  },
  Attr: function() {
    return document.createAttribute('href');
  },
  Document: function() {
      // TODO: might be HTMLDocument
      return document;
  },
  DocumentType: function() {
    // TODO: depends on specific markup
    return document.doctype;
  },
  HTMLAudioElement: function() {
    return document.createElement('audio');
  },
  SpeechSynthesis: function() {
    return window.speechSynthesis;
  },
  Window: function() {
    return window;
  },
  XSLTProcessor: function() {
    return new XSLTProcessor();
  },
};
