// ============================================================
// SIKKA Security Module  (SWE2 Phase 1 — extra protection layer)
// Salted SHA-256 password hashing. Pure JavaScript so it runs
// directly from file:// (no server / no Web Crypto required).
// ============================================================

var SIKKASec = (function () {

  // ---- SHA-256 (public-domain compact implementation, UTF-8 safe) ----
  function sha256(message) {
    // encode to UTF-8 so non-ASCII characters hash correctly
    var ascii = unescape(encodeURIComponent(message));

    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }

    var maxWord = Math.pow(2, 32);
    var result = "";
    var words = [];
    var asciiBitLength = ascii.length * 8;

    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k.length;

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (var i = 0; i < 313; i += candidate) { isComposite[i] = candidate; }
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    ascii += "\x80";
    while (ascii.length % 64 - 56) { ascii += "\x00"; }
    for (var i = 0; i < ascii.length; i++) {
      var j = ascii.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (var j = 0; j < words.length;) {
      var w = words.slice(j, j += 16);
      var oldHash = hash;
      hash = hash.slice(0, 8);

      for (var i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }

      for (var i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }

    for (var i = 0; i < 8; i++) {
      for (var j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : "") + b.toString(16);
      }
    }
    return result;
  }

  // ---- Salt generation (16 hex chars = 64 bits) ----
  function genSalt() {
    // prefer a cryptographic RNG when the browser exposes it
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      var bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      var s = "";
      for (var i = 0; i < bytes.length; i++) {
        s += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
      }
      return s;
    }
    // fallback for environments without crypto
    var out = "";
    while (out.length < 16) { out += Math.floor(Math.random() * 16).toString(16); }
    return out.slice(0, 16);
  }

  // ---- Public API ----
  // hashPassword: combine salt + password, then SHA-256.
  function hashPassword(password, salt) {
    return sha256(salt + password);
  }

  // verifyPassword: recompute the hash and compare (constant-ish check).
  function verifyPassword(password, salt, storedHash) {
    return hashPassword(password, salt) === storedHash;
  }

  // makeCredential: build a fresh {salt, hash} pair for a new/updated password.
  function makeCredential(password) {
    var salt = genSalt();
    return { salt: salt, hash: hashPassword(password, salt) };
  }

  return {
    sha256: sha256,
    genSalt: genSalt,
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    makeCredential: makeCredential
  };
})();

// allow this file to be required in Node (used to pre-compute hashes/tests)
if (typeof module !== "undefined" && module.exports) {
  module.exports = SIKKASec;
}
