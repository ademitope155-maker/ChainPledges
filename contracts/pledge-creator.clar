(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-AMOUNT u101)
(define-constant ERR-INVALID-FREQUENCY u102)
(define-constant ERR-INVALID-DURATION u103)
(define-constant ERR-INVALID-BENEFICIARY u104)
(define-constant ERR-PLEDGE-ALREADY-EXISTS u105)
(define-constant ERR-PLEDGE-NOT-FOUND u106)
(define-constant ERR-INVALID-TIMESTAMP u107)
(define-constant ERR-ESCROW-FAILED u108)
(define-constant ERR-SCHEDULE-FAILED u109)
(define-constant ERR-MAX-PLEDGES-EXCEEDED u110)
(define-constant ERR-INVALID-METADATA u111)
(define-constant ERR-INVALID-CURRENCY u112)
(define-constant ERR-INVALID-INTERVAL u113)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u114)
(define-constant ERR-INVALID-OWNER u115)
(define-constant ERR-PLEDGE-INACTIVE u116)
(define-constant ERR-INSUFFICIENT-FUNDS u117)
(define-constant ERR-INVALID-PLEDGE-ID u118)
(define-constant ERR-UPDATE-NOT-ALLOWED u119)
(define-constant ERR-INVALID-UPDATE-AMOUNT u120)

(define-data-var next-pledge-id uint u0)
(define-data-var max-pledges uint u500)
(define-data-var creation-fee uint u500)
(define-data-var authority-contract (optional principal) none)
(define-data-var escrow-contract principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.escrow-vault)

(define-map pledges
  uint
  {
    owner: principal,
    amount: uint,
    frequency: uint,
    duration: uint,
    beneficiary: principal,
    active: bool,
    timestamp: uint,
    metadata: (string-utf8 100),
    currency: (string-utf8 10),
    interval: uint,
    executions: uint
  }
)

(define-map pledges-by-hash
  (buff 32)
  uint
)

(define-map pledge-updates
  uint
  {
    update-amount: uint,
    update-frequency: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-pledge (id uint))
  (map-get? pledges id)
)

(define-read-only (get-pledge-updates (id uint))
  (map-get? pledge-updates id)
)

(define-read-only (is-pledge-registered (hash (buff 32)))
  (is-some (map-get? pledges-by-hash hash))
)

(define-private (validate-amount (amt uint))
  (if (> amt u0)
      (ok true)
      (err ERR-INVALID-AMOUNT))
)

(define-private (validate-frequency (freq uint))
  (if (and (> freq u0) (<= freq u365))
      (ok true)
      (err ERR-INVALID-FREQUENCY))
)

(define-private (validate-duration (dur uint))
  (if (or (eq dur u0) (> dur u0))
      (ok true)
      (err ERR-INVALID-DURATION))
)

(define-private (validate-beneficiary (ben principal))
  (if (is-principal ben)
      (ok true)
      (err ERR-INVALID-BENEFICIARY))
)

(define-private (validate-metadata (meta (string-utf8 100)))
  (if (<= (len meta) u100)
      (ok true)
      (err ERR-INVALID-METADATA))
)

(define-private (validate-currency (cur (string-utf8 10)))
  (if (or (is-eq cur "STX") (is-eq cur "sBTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-interval (inter uint))
  (if (and (> inter u0) (<= inter u4320))
      (ok true)
      (err ERR-INVALID-INTERVAL))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-pledges (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-PLEDGE-ID))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-pledges new-max)
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-AMOUNT))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (create-pledge
  (amt uint)
  (freq uint)
  (dur uint)
  (ben principal)
  (meta (string-utf8 100))
  (cur (string-utf8 10))
  (inter uint)
)
  (let
    (
      (next-id (var-get next-pledge-id))
      (current-max (var-get max-pledges))
      (authority (var-get authority-contract))
      (pledge-hash (sha256 (concat (hash-pvx tx-sender) (hash-pvx ben))))
    )
    (asserts! (< next-id current-max) (err ERR-MAX-PLEDGES-EXCEEDED))
    (try! (validate-amount amt))
    (try! (validate-frequency freq))
    (try! (validate-duration dur))
    (try! (validate-beneficiary ben))
    (try! (validate-metadata meta))
    (try! (validate-currency cur))
    (try! (validate-interval inter))
    (asserts! (is-none (map-get? pledges-by-hash pledge-hash)) (err ERR-PLEDGE-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (try! (contract-call? (var-get escrow-contract) deposit tx-sender amt))
    (map-set pledges next-id
      {
        owner: tx-sender,
        amount: amt,
        frequency: freq,
        duration: dur,
        beneficiary: ben,
        active: true,
        timestamp: block-height,
        metadata: meta,
        currency: cur,
        interval: inter,
        executions: u0
      }
    )
    (map-set pledges-by-hash pledge-hash next-id)
    (var-set next-pledge-id (+ next-id u1))
    (print { event: "pledge-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-pledge
  (pledge-id uint)
  (update-amt uint)
  (update-freq uint)
)
  (let ((pledge (map-get? pledges pledge-id)))
    (match pledge
      p
        (begin
          (asserts! (is-eq (get owner p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (get active p) (err ERR-PLEDGE-INACTIVE))
          (try! (validate-amount update-amt))
          (try! (validate-frequency update-freq))
          (map-set pledges pledge-id
            {
              owner: (get owner p),
              amount: update-amt,
              frequency: update-freq,
              duration: (get duration p),
              beneficiary: (get beneficiary p),
              active: (get active p),
              timestamp: block-height,
              metadata: (get metadata p),
              currency: (get currency p),
              interval: (get interval p),
              executions: (get executions p)
            }
          )
          (map-set pledge-updates pledge-id
            {
              update-amount: update-amt,
              update-frequency: update-freq,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "pledge-updated", id: pledge-id })
          (ok true)
        )
      (err ERR-PLEDGE-NOT-FOUND)
    )
  )
)

(define-public (get-pledge-count)
  (ok (var-get next-pledge-id))
)

(define-public (check-pledge-existence (hash (buff 32)))
  (ok (is-pledge-registered hash))
)