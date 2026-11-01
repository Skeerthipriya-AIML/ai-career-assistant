import hashlib
import logging

logger = logging.getLogger(__name__)

class VirusScanner:
    @staticmethod
    def scan(file_bytes: bytes) -> bool:
        """
        Simulates an enterprise compliance antivirus scanner.
        Returns True if the file is clean, False if infected.
        """
        eicar_signature = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
        if eicar_signature in file_bytes:
            logger.error("COMPLIANCE VIOLATION: EICAR malware test signature detected!")
            return False
            
        if len(file_bytes) > 25 * 1024 * 1024:
            logger.warning("Antivirus compliance scan warning: Large file ingestion.")
            
        return True

    @staticmethod
    def get_fingerprint(file_bytes: bytes) -> str:
        """
        Calculates SHA-256 hash fingerprint of the file.
        Used for deduplication and versioning checks.
        """
        return hashlib.sha256(file_bytes).hexdigest()
