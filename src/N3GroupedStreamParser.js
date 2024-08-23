// **N3GroupedStreamParser** parses a text stream into a quad stream.
import { Transform } from 'readable-stream';
import N3Parser from './N3Parser';

const groupBeginRegex = /^@group begin (.*)$/;
const groupEndRegex = /^@group end (.*)$/;

// ## Constructor
export default class N3GroupedStreamParser extends Transform {
  constructor(options) {
    super({ decodeStrings: true });
    this._readableState.objectMode = true;
    this.groups = {};


    // Set up parser with dummy stream to obtain `data` and `end` callbacks
    const parser = new N3Parser({ lexerOptions: { comments: true }, ...options });
    let onData, onEnd;
    parser.parse({
        on: (event, callback) => {
          switch (event) {
          case 'data':
            onData = callback;
            break;
          case 'end':
            onEnd = callback;
            break;
          }
        },
      },
      // Handle quads by pushing them down the pipeline
      (error, quad) => {
        if (error) {
          this.emit('error', error);
        }
        if (quad) {
          // If no groups are defined, push the quad
          if (Object.keys(this.groups).length === 0) {
            this.push(quad);
          }
          else {
            // Otherwise, push the quad to all groups
            for (const groupName in this.groups) {
              this.groups[groupName].push(quad);
            }
          }
        }
      },
      // Emit prefixes through the `prefix` event
      (prefix, uri) => {
        this.emit('prefix', prefix, uri);
      },
      (comment) => {
      const trimmedComment = comment.value.trim();
        const groupBeginMatch = groupBeginRegex.exec(trimmedComment);
        if (groupBeginMatch) {
          const groupName = groupBeginMatch[1].trim();
          if (!(groupName in this.groups)) {
            this.groups[groupName] = [];
          }
          // Group already exists, so ignore
        }
        else {
          const groupEndMatch = groupEndRegex.exec(trimmedComment);
          if (groupEndMatch) {
            const groupName = groupEndMatch[1].trim();
            if (groupName in this.groups) {
              // The group is complete, push all quads to the pipeline
              this.groups[groupName].forEach(quad => this.push(quad));
              delete this.groups[groupName];
            }
          }
        }
      },
    );

    // Implement Transform methods through parser callbacks
    this._transform = (chunk, encoding, done) => {
      onData(chunk);
      done();
    };
    this._flush = done => {
      onEnd();
      done();
    };
  }

  // ### Parses a stream of strings
  import(stream) {
    stream.on('data', chunk => {
      this.write(chunk);
    });
    stream.on('end', () => {
      this.end();
    });
    stream.on('error', error => {
      this.emit('error', error);
    });
    return this;
  }
}
