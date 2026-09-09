#!/usr/bin/env python3
"""Catalogue and download the requested Sketchfab vehicles through its official API.

No viewer scraping or authentication bypass. No credential or signed URL is logged
or written. The default run catalogues everything, then downloads when an existing
SKETCHFAB_API_TOKEN is configured. --catalog-only is completely offline.
"""
from __future__ import annotations

import argparse
import copy
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source/inkstorm"
API_ROOT = "https://api.sketchfab.com/v3"
UID = re.compile(r"^[a-f0-9]{32}$")
EXCLUDED = {
    "f0f7c6046dcf4e03acb83ba5335f927e": "Sand-pit scenery scan; not a racing vehicle.",
    "bf27702f670247c0afb23a64c9119520": "Photogrammetry of a gondola cabin; excluded from the requested racing-vehicle set.",
    "de647073cd03464aaddb5227baf41bab": "Tatooine environment/scenery entry; not a vehicle model.",
}
VARIANTS = {
    "ce9c2d4e92a44dffbd78e6b29d6c0182": "emmasartgallery-podracer-formats",
    "19a50e866e5d44cb8e4840b616cc8132": "emmasartgallery-podracer-formats",
    "ff12ef200c994c8b9c6b61ea45702454": "emmasartgallery-podracer-formats",
    "a6f14ae799ab40d7ac425f043f824ff8": "20001748-pod-racer-colour-variants",
    "e42fb924b344481ea013c58cb0f52ad7": "20001748-pod-racer-colour-variants",
    "eb1a1861d3f140fa958ca7eb70a9f380": "bkids-mwrb-variants",
    "0baa936f45434c7eb8d58c31890402a2": "bkids-mwrb-variants",
}
VEHICLE_TYPES = {
    "fee6dfa2369149aa84e7f99d9bb35cb0": "pod-inspired spaceship",
    "7766ca8e7bd047f5ad4bdb86d11ec6d4": "airspeeder",
    "39f96d4fcf00432dba3beb2e42163aa6": "hover transporter",
    "5a927a9fa0984371bd970b31f5f06086": "pod-inspired spaceship",
    "9ecf7f66246d4f30b990cc605359e3b6": "racing spacecraft",
    "eb1a1861d3f140fa958ca7eb70a9f380": "vehicle candidate; geometry inspection pending",
    "0baa936f45434c7eb8d58c31890402a2": "vehicle candidate; geometry inspection pending",
}
PROVENANCE_NOTES = {
    "41071debeaf1499a9a1586b78ea18a09": "Author explicitly describes reusing N64 game textures. Preserve this provenance; new painted textures should replace those textures before a production export.",
    "e377c2e49ad447caa0517b87562b3acc": "The listing identifies a Star Wars Galaxies game asset. Preserve original source metadata during review.",
    "7766ca8e7bd047f5ad4bdb86d11ec6d4": "The listing identifies a Star Wars Galaxies game asset. Preserve original source metadata during review.",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def license_assessment(raw: dict) -> dict:
    label = raw.get("label", "Unspecified")
    no_derivatives = "noderiv" in label.lower().replace("-", "")
    non_commercial = "noncommercial" in label.lower().replace("-", "")
    known_cc = label.startswith("CC ")
    license_url = raw.get("url") or raw.get("uri")
    parsed_license = urllib.parse.urlsplit(license_url or "")
    exact_nc_nd_4 = parsed_license.hostname == "creativecommons.org" and parsed_license.path.rstrip("/") == "/licenses/by-nc-nd/4.0"
    if no_derivatives:
        stylization_status = "private_noncommercial_study_only" if exact_nc_nd_4 else "license_review_required"
        stylization_note = "CC BY-NC-ND 4.0 permits producing/reproducing adaptations for private noncommercial study. Do not share adapted assets through public runtime, repositories or deployments without additional permission." if exact_nc_nd_4 else "Verify the exact license version before private adaptation. Keep adapted assets out of public runtime, repositories and deployments without appropriate permission."
    else:
        stylization_status = "permitted_by_reported_license" if known_cc else "license_review_required"
        stylization_note = "Retain attribution and stated license conditions. Record the exact license version from official metadata before an export intended for sharing."
    return {
        "reported": raw,
        "licenseUrl": license_url,
        "attributionRequired": "Attribution" in label,
        "nonCommercialOnly": non_commercial,
        "stylizationStatus": stylization_status,
        "stylizationNote": stylization_note,
        "publicAdaptationEligibility": "not_permitted_without_separate_permission" if no_derivatives else "subject_to_reported_license_conditions",
        "privateStudyEligibility": "noncommercial_adaptation_permitted" if exact_nc_nd_4 else "verify_exact_license" if no_derivatives else "subject_to_reported_license_conditions",
    }


def catalogue(snapshot: dict, existing: dict | None = None) -> dict:
    old_by_uid = {item["uid"]: item for item in [*(existing or {}).get("catalogueHistory", []), *(existing or {}).get("models", [])]}
    models = []
    seen: set[str] = set()
    for ordinal, model in enumerate(snapshot.get("results", []), 1):
        uid = model.get("uid", "")
        if not UID.fullmatch(uid) or uid in seen:
            raise ValueError("Search snapshot contains an invalid or duplicate model UID.")
        seen.add(uid)
        included = uid not in EXCLUDED
        user = model.get("user", {})
        old = old_by_uid.get(uid, {})
        models.append({
            **copy.deepcopy(old),
            "ordinal": ordinal, "uid": uid, "title": model.get("name", uid),
            "modelUrl": old.get("modelUrl") or model.get("viewerUrl") or f"https://sketchfab.com/3d-models/{uid}",
            "apiUrl": f"{API_ROOT}/models/{uid}",
            "downloadApiUrl": f"{API_ROOT}/models/{uid}/download",
            "author": {"uid": user.get("uid"), "username": user.get("username"), "displayName": user.get("displayName"), "profileUrl": user.get("profileUrl")},
            "license": copy.deepcopy(old.get("license")) if old.get("license") else license_assessment(model.get("license") or {}),
            "classification": {**copy.deepcopy(old.get("classification", {})), "included": included, "kind": VEHICLE_TYPES.get(uid, "podracer") if included else "non-racing-vehicle result",
                "basis": old.get("classification", {}).get("basis", "Public search title, description and tags; downloaded geometry not inspected."),
                "exclusionReason": EXCLUDED.get(uid), "variantGroup": VARIANTS.get(uid), "variantsRetained": True},
            "description": model.get("description", ""),
            "reportedGeometry": {"faces": model.get("faceCount"), "vertices": model.get("vertexCount")},
            "downloadableAtDiscovery": model.get("isDownloadable") is True,
            "driver": copy.deepcopy(old.get("driver", {"status": "unverified_until_geometry_inspection", "requiredAction": "Inspect cockpit occupancy after import; add an original Inkstorm pilot to each unoccupied drivable craft."})),
            "sourceProvenanceNote": old.get("sourceProvenanceNote") or PROVENANCE_NOTES.get(uid),
            "stylizedExport": old.get("stylizedExport", {"status": "not_started", "path": None}),
            "download": copy.deepcopy(old.get("download", {"status": "pending_authentication" if included else "excluded", "archive": None, "receipt": None})),
        })
    # An offline refresh must not erase prior acquisitions if a later public
    # search omits a UID. Retain those records separately from current results.
    omitted = [copy.deepcopy(item) for uid, item in old_by_uid.items() if uid not in seen]
    history = copy.deepcopy((existing or {}).get("catalogueHistory", []))
    known_history = {item.get("uid") for item in history}
    history.extend(item for item in omitted if item["uid"] not in known_history)
    return {**copy.deepcopy(existing or {}), "version": 2, "updatedAt": utc_now(), "query": snapshot.get("query"), "filter": snapshot.get("filter"),
        "catalogueHistory": history,
        "searchPages": snapshot.get("pages", []), "sourceSnapshot": "sketchfab-search.json", "models": models}


class NoAuthRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, newurl):
        parsed = urllib.parse.urlsplit(newurl)
        if parsed.scheme != "https" or parsed.netloc != "api.sketchfab.com":
            raise ValueError("Refused cross-origin authenticated API redirect.")
        return super().redirect_request(request, response, code, message, headers, newurl)


def api_json(path: str, token: str, scheme: str) -> dict:
    request = urllib.request.Request(API_ROOT + path, headers={
        "Authorization": f"{scheme} {token}", "Accept": "application/json", "User-Agent": "InkstormAssetIngestion/1.0"})
    opener = urllib.request.build_opener(NoAuthRedirect())
    with opener.open(request, timeout=60) as response:
        payload = response.read(8_000_001)
    if len(payload) > 8_000_000:
        raise ValueError("Official API response exceeds metadata limit.")
    value = json.loads(payload)
    if not isinstance(value, dict):
        raise ValueError("Official API response is not an object.")
    return value


def allowed_archive_url(url: str) -> bool:
    parsed = urllib.parse.urlsplit(url)
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and not parsed.username and not parsed.password and parsed.port in (None, 443) and any(
        host == suffix or host.endswith("." + suffix) for suffix in ("sketchfab.com", "amazonaws.com", "cloudfront.net"))


class ArchiveRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, newurl):
        if not allowed_archive_url(newurl):
            raise ValueError("Refused archive redirect outside the official media hosts.")
        return super().redirect_request(request, response, code, message, headers, newurl)


def download_archive(url: str, destination: Path, max_bytes: int) -> None:
    if not allowed_archive_url(url):
        raise ValueError("Official download response contained an unsupported media URL.")
    partial = destination.with_suffix(destination.suffix + ".part")
    # Deliberately separate opener: account credentials never reach media hosts.
    opener = urllib.request.build_opener(ArchiveRedirect())
    request = urllib.request.Request(url, headers={"User-Agent": "InkstormAssetIngestion/1.0"})
    with opener.open(request, timeout=120) as response, partial.open("wb") as output:
        if int(response.headers.get("Content-Length", "0")) > max_bytes:
            raise ValueError("Archive exceeds configured byte limit.")
        total = 0
        while chunk := response.read(1024 * 1024):
            total += len(chunk)
            if total > max_bytes:
                raise ValueError("Archive exceeds configured byte limit.")
            output.write(chunk)
        output.flush()
        os.fsync(output.fileno())
    if destination.exists():
        destination.rename(destination.with_name(f"{destination.name}.previous-{time.time_ns()}"))
    os.replace(partial, destination)


def safe_extract(archive: Path, destination: Path, max_bytes: int, max_files: int = 10000) -> list[dict]:
    """Validate the whole ZIP before writing; reject traversal, links and bombs."""
    files: list[tuple[zipfile.ZipInfo, PurePosixPath]] = []
    names: set[str] = set()
    with zipfile.ZipFile(archive) as source:
        infos = source.infolist()
        if len(infos) > max_files:
            raise ValueError("Archive has too many members.")
        total = 0
        for info in infos:
            raw = info.filename.rstrip("/")
            if not raw:
                continue
            parts = raw.split("/")
            path = PurePosixPath(raw)
            if path.is_absolute() or "\\" in raw or any(part in ("", ".", "..") for part in parts) or any(":" in part for part in parts) or any(ord(char) < 32 for char in raw):
                raise ValueError("Archive contains an unsafe path.")
            normalized = unicodedata.normalize("NFC", raw).casefold()
            if normalized in names:
                raise ValueError("Archive paths collide on the target filesystem.")
            names.add(normalized)
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)) or info.flag_bits & 1:
                raise ValueError("Archive contains a link, special file or encrypted member.")
            total += info.file_size
            if total > max_bytes or info.file_size > max_bytes:
                raise ValueError("Archive expansion exceeds configured byte limit.")
            files.append((info, path))
        staging = Path(tempfile.mkdtemp(prefix=".extract-", dir=destination.parent))
        receipts = []
        try:
            for info, path in files:
                target = staging.joinpath(*path.parts)
                if info.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                extracted = 0
                with source.open(info) as input_stream, target.open("xb") as output:
                    while chunk := input_stream.read(1024 * 1024):
                        extracted += len(chunk)
                        if extracted > info.file_size or extracted > max_bytes:
                            raise ValueError("ZIP member expanded beyond its declared size.")
                        output.write(chunk)
                if extracted != info.file_size:
                    raise ValueError("ZIP member size did not match its declaration.")
                receipts.append({"path": path.as_posix(), "bytes": extracted, "sha256": sha256(target)})
            if destination.exists():
                # Preserve earlier source copies even if they failed verification.
                backup = destination.with_name(f"{destination.name}.previous-{time.time_ns()}")
                destination.rename(backup)
            staging.rename(destination)
        finally:
            if staging.exists():
                shutil.rmtree(staging)
    return receipts


def verified_mcp_source(item: dict, output: Path) -> bool:
    """Verify a preserved MCP GLB without decoding its images or vertex data."""
    download = item.get("download", {})
    if download.get("method") != "official_blender_mcp" or download.get("artifactKind") != "normalized_imported_source_glb":
        return False
    try:
        model_directory = (output / "vehicles" / item["uid"]).resolve()
        if not UID.fullmatch(item["uid"]) or not model_directory.is_relative_to(output.resolve() / "vehicles"):
            return False
        source = (output / download["sourceGlb"]).resolve()
        receipt_path = (output / download["receipt"]).resolve()
        if not source.is_relative_to(model_directory) or not receipt_path.is_relative_to(model_directory):
            return False
        receipt = json.loads(receipt_path.read_text())
        recorded = receipt["sourceGlb"]
        if receipt["uid"] != item["uid"] or (output / recorded["path"]).resolve() != source:
            return False
        size = source.stat().st_size
        if size != recorded["bytes"] or recorded["sha256"] != download["sha256"] or sha256(source) != recorded["sha256"]:
            return False
        with source.open("rb") as stream:
            header = stream.read(12)
        if len(header) != 12 or header[:4] != b"glTF" or int.from_bytes(header[4:8], "little") != 2 or int.from_bytes(header[8:12], "little") != size:
            return False
        # Metadata may be refreshed independently; the original successful
        # download/export receipts must still match the acquisition record.
        for key in ("downloadReceipt", "exportReceipt"):
            evidence = (output / receipt["acquisition"][key]).resolve()
            if not evidence.is_relative_to(model_directory) or sha256(evidence) != receipt["evidenceHashes"][evidence.name]:
                return False
            if json.loads(evidence.read_text()).get("uid") != item["uid"]:
                return False
        return True
    except (KeyError, ValueError, OSError, TypeError, AttributeError):
        return False


def verified_download(item: dict, output: Path) -> bool:
    download = item.get("download", {})
    if download.get("status") != "downloaded":
        return False
    if download.get("artifactKind") == "normalized_imported_source_glb":
        return verified_mcp_source(item, output)
    try:
        model_directory = (output / "vehicles" / item["uid"]).resolve()
        if not UID.fullmatch(item["uid"]) or not model_directory.is_relative_to(output.resolve() / "vehicles"):
            return False
        receipt_path = (output / download["receipt"]).resolve()
        archive = (output / download["archive"]).resolve()
        if not receipt_path.is_relative_to(model_directory) or not archive.is_relative_to(model_directory):
            return False
        receipt = json.loads(receipt_path.read_text())
        if receipt.get("uid") != item["uid"] or not archive.is_file() or sha256(archive) != receipt["archive"]["sha256"]:
            return False
        directory = (output / receipt["extractedDirectory"]).resolve()
        if not directory.is_relative_to(model_directory) or not receipt.get("files"):
            return False
        return all((directory / entry["path"]).resolve().is_relative_to(directory)
                   and (directory / entry["path"]).is_file()
                   and sha256(directory / entry["path"]) == entry["sha256"] for entry in receipt["files"])
    except (KeyError, ValueError, OSError, TypeError):
        return False


def set_download_record(item: dict, record: dict) -> None:
    """Retain prior 429/source/provenance evidence when an actual state changes."""
    previous = item.get("download")
    if previous == record:
        return
    if previous:
        item.setdefault("downloadHistory", []).append({"recordedAt": utc_now(), "download": copy.deepcopy(previous)})
    item["download"] = record


def needs_acquisition(item: dict, output: Path, catalog_only: bool, token_available: bool) -> bool:
    if verified_download(item, output):
        return False
    download = item.get("download", {})
    if download.get("status") == "downloaded":
        # Keep every source path and receipt for recovery; a missing/corrupt
        # file is an integrity failure, not a newly inferred authentication gap.
        set_download_record(item, {**download, "status": "verification_failed", "verificationFailure": "Saved source or acquisition receipt no longer matches its recorded hash."})
    if catalog_only or not token_available:
        return False
    return True


def acquire(item: dict, output: Path, token: str, scheme: str, max_archive_bytes: int, max_extract_bytes: int) -> None:
    uid = item["uid"]
    directory = output / "vehicles" / uid
    directory.mkdir(parents=True, exist_ok=True)
    metadata = api_json(f"/models/{uid}", token, scheme)
    if metadata.get("uid") != uid or metadata.get("isDownloadable") is not True:
        raise ValueError("Model is no longer available as an official download.")
    # Metadata/attribution is saved before the expiring download URL is requested.
    write_json(directory / "model-metadata.json", metadata)
    if metadata.get("license"):
        item["license"] = license_assessment(metadata["license"])
    details = api_json(f"/models/{uid}/download", token, scheme)
    available = [(name, details.get(name)) for name in ("gltf", "glb", "usdz")]
    selected = next(((name, descriptor) for name, descriptor in available if isinstance(descriptor, dict) and isinstance(descriptor.get("url"), str)), None)
    if not selected:
        raise ValueError("Official API returned no supported archive format.")
    format_name, descriptor = selected
    if isinstance(descriptor.get("size"), (int, float)) and descriptor["size"] > max_archive_bytes:
        raise ValueError("Archive exceeds configured byte limit.")
    extension = "zip" if format_name == "gltf" else format_name
    archive = directory / f"original.{extension}"
    download_archive(descriptor["url"], archive, max_archive_bytes)
    extracted = directory / "extracted"
    if zipfile.is_zipfile(archive):
        files = safe_extract(archive, extracted, max_extract_bytes)
    elif format_name == "glb":
        with archive.open("rb") as stream:
            header = stream.read(12)
        if len(header) != 12 or header[:4] != b"glTF" or int.from_bytes(header[4:8], "little") != 2 or int.from_bytes(header[8:12], "little") != archive.stat().st_size:
            raise ValueError("Downloaded GLB header or length is invalid.")
        if extracted.exists():
            extracted.rename(extracted.with_name(f"{extracted.name}.previous-{time.time_ns()}"))
        extracted.mkdir()
        shutil.copyfile(archive, extracted / "scene.glb")
        files = [{"path": "scene.glb", "bytes": archive.stat().st_size, "sha256": sha256(archive)}]
    else:
        raise ValueError("Official archive is not a valid ZIP/GLB.")
    model_files = [entry for entry in files if Path(entry["path"]).suffix.lower() in ((".gltf", ".glb") if format_name != "usdz" else (".usd", ".usda", ".usdc"))]
    if not model_files:
        raise ValueError("Official archive contains no model file in the selected format.")
    for entry in model_files:
        if entry["path"].lower().endswith(".gltf"):
            gltf = json.loads((extracted / entry["path"]).read_text(encoding="utf-8"))
            if not isinstance(gltf, dict) or not str(gltf.get("asset", {}).get("version", "")).startswith("2."):
                raise ValueError("Downloaded glTF does not declare glTF 2.x.")
    receipt = {"version": 1, "uid": uid, "downloadedAt": utc_now(), "sourceModelUrl": item["modelUrl"],
        "officialDownloadEndpoint": item["downloadApiUrl"], "author": item["author"], "license": item["license"],
        "format": format_name, "archive": {"path": str(archive.relative_to(output)), "bytes": archive.stat().st_size, "sha256": sha256(archive)},
        "extractedDirectory": str(extracted.relative_to(output)), "files": files,
        "metadataSha256": sha256(directory / "model-metadata.json"),
        "signedDownloadUrlPersisted": False, "credentialsPersisted": False}
    receipt_path = directory / "download-receipt.json"
    write_json(receipt_path, receipt)
    write_json(directory / "license-receipt.json", {"uid": uid, "sourceModelUrl": item["modelUrl"], "author": item["author"], "license": item["license"], "capturedAt": utc_now()})
    set_download_record(item, {"status": "downloaded", "method": "official_api_cli", "artifactKind": "official_archive", "archive": str(archive.relative_to(output)), "receipt": str(receipt_path.relative_to(output)),
        "sha256": receipt["archive"]["sha256"], "format": format_name, "downloadedAt": receipt["downloadedAt"]})


def counts(manifest: dict) -> dict:
    models = manifest["models"]
    included = [item for item in models if item["classification"]["included"]]
    statuses = Counter(item["download"]["status"] for item in included)
    completed = [item for item in included if item["download"]["status"] == "downloaded"]
    return {"publicResults": len(models), "vehicleCandidates": len(included), "excludedNonVehicles": len(models) - len(included),
        "downloaded": statuses["downloaded"], "blockedOrPending": len(included) - statuses["downloaded"],
        "downloadStatuses": dict(sorted(statuses.items())),
        "mcpImportedSourceGlbs": sum(item["download"].get("artifactKind") == "normalized_imported_source_glb" for item in completed),
        "rawArchivesPreserved": sum(bool(item["download"].get("archive")) for item in completed),
        "stylizationNeedsPermission": sum(item["license"]["stylizationStatus"] == "needs_permission" for item in included),
        "publicAdaptationRestricted": sum(item["license"].get("publicAdaptationEligibility") == "not_permitted_without_separate_permission" for item in included),
        "stylizedExports": sum(item["stylizedExport"]["status"] == "complete" for item in included),
        "stylizedSourceStudies": sum(item.get("stylizedSourceStudy", {}).get("status") == "complete" for item in included),
        "stylizedExportVariants": sum(len(item.get("stylizedExport", {}).get("variants", [])) for item in included if item.get("stylizedExport", {}).get("status") == "complete"),
        "driversAdded": sum(item.get("driver", {}).get("pilotAdded") is True for item in included),
        "runtimeIntegrations": sum(item.get("runtimeIntegration", {}).get("status") == "complete" for item in included),
        "driverInspections": sum(item.get("sourceInspection", {}).get("driverInspected") is True for item in included)}


def catalogue_self_test() -> None:
    """Exercise the real refresh/resume entrypoint in temporary files only."""
    import contextlib
    import io
    import struct
    from unittest import mock

    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        uids = [character * 32 for character in "abcd"]
        snapshot = {"query": "podracer", "filter": "downloadable", "pages": [], "results": [
            {"uid": uid, "name": f"Fixture {uid[0]}", "license": {"label": "CC Attribution"}, "isDownloadable": True} for uid in uids]}
        manifest = catalogue(snapshot)
        manifest["authenticationProvider"] = "Blender MCP Sketchfab"
        manifest["authenticationConfigured"] = True
        manifest["acquisitionState"] = {"status": "stopped_after_rate_limit", "httpStatus": 429}
        for item in manifest["models"][:2]:
            uid = item["uid"]
            directory = root / "vehicles" / uid
            directory.mkdir(parents=True)
            payload = json.dumps({"asset": {"version": "2.0"}, "scenes": [{"nodes": []}]}).encode()
            payload += b" " * (-len(payload) % 4)
            source = directory / "imported-source.glb"
            source.write_bytes(struct.pack("<4sIIII", b"glTF", 2, 20 + len(payload), len(payload), 0x4E4F534A) + payload)
            for name in ("mcp-download.json", "mcp-export.json"):
                write_json(directory / name, {"uid": uid, "result": "fixture success"})
            receipt = {"uid": uid, "sourceGlb": {"path": str(source.relative_to(root)), "bytes": source.stat().st_size, "sha256": sha256(source)},
                "acquisition": {"downloadReceipt": str((directory / "mcp-download.json").relative_to(root)), "exportReceipt": str((directory / "mcp-export.json").relative_to(root))},
                "evidenceHashes": {name: sha256(directory / name) for name in ("mcp-download.json", "mcp-export.json")}}
            write_json(directory / "source-receipt.json", receipt)
            item["download"] = {"status": "downloaded", "method": "official_blender_mcp", "artifactKind": "normalized_imported_source_glb", "archive": None,
                "sourceGlb": str(source.relative_to(root)), "receipt": str((directory / "source-receipt.json").relative_to(root)), "sha256": sha256(source)}
            item["license"].update({"version": "4.0", "verifiedFrom": item["apiUrl"]})
            item["sourceInspection"] = {"driverInspected": False, "customReceipt": "retained"}
            item["downloadHistory"] = [{"download": {"status": "pending_download", "customProvenance": "retained"}}]
            assert verified_download(item, root)
        archive_item = manifest["models"][2]
        directory = root / "vehicles" / archive_item["uid"]
        directory.mkdir(parents=True)
        archive = directory / "original.zip"; archive.write_bytes(b"fixture archived bytes")
        extracted = directory / "extracted"; extracted.mkdir(); (extracted / "scene.gltf").write_text('{"asset":{"version":"2.0"}}')
        write_json(directory / "download-receipt.json", {"uid": archive_item["uid"], "archive": {"sha256": sha256(archive)},
            "extractedDirectory": str(extracted.relative_to(root)), "files": [{"path": "scene.gltf", "sha256": sha256(extracted / "scene.gltf")}]})
        archive_item["download"] = {"status": "downloaded", "archive": str(archive.relative_to(root)), "receipt": str((directory / "download-receipt.json").relative_to(root))}
        archive_item["stylizedExport"] = {"status": "complete", "path": "fixture-export.glb", "variants": [{"kind": "hero"}, {"kind": "rival"}]}
        archive_item["stylizedSourceStudy"] = {"status": "complete", "receipt": "fixture-study.json"}
        archive_item["driver"] = {"pilotAdded": True, "status": "original_driver_added_to_derived_export"}
        archive_item["runtimeIntegration"] = {"status": "complete", "path": "fixture-runtime.glb"}
        archive_item["sourceInspection"] = {"driverInspected": True}
        limited = manifest["models"][3]
        limited["download"] = {"status": "rate_limited", "httpStatus": 429, "receipt": "preserve-this-receipt", "method": "official_blender_mcp"}
        write_json(root / "snapshot.json", snapshot); write_json(root / "vehicle-manifest.json", manifest)
        original = copy.deepcopy(manifest)
        args = ["download-sketchfab-vehicles.py", "--snapshot", str(root / "snapshot.json"), "--output", str(root)]
        # Real catalog-only path: missing CLI token must not overwrite MCP auth,
        # either source record, its hashes/history, or the prior 429 evidence.
        with mock.patch.object(sys, "argv", [*args, "--catalog-only"]), mock.patch.dict(os.environ, {"SKETCHFAB_API_TOKEN": ""}), mock.patch(__name__ + ".api_json", side_effect=AssertionError("Offline test attempted network")), contextlib.redirect_stdout(io.StringIO()):
            assert main() == 0
        refreshed = json.loads((root / "vehicle-manifest.json").read_text())
        for before, after in zip(original["models"], refreshed["models"]):
            for key in ("download", "license", "driver", "sourceInspection", "downloadHistory", "runtimeIntegration", "stylizedExport", "stylizedSourceStudy"):
                assert before.get(key) == after.get(key), key
        assert refreshed["acquisitionState"] == original["acquisitionState"]
        assert refreshed["authenticationConfigured"] is True and refreshed["cliAuthentication"]["configured"] is False
        c = refreshed["counts"]
        assert c["downloaded"] == 3 and c["mcpImportedSourceGlbs"] == 2 and c["rawArchivesPreserved"] == 1
        assert c["stylizedExports"] == c["runtimeIntegrations"] == c["driverInspections"] == 1
        assert c["stylizedSourceStudies"] == c["driversAdded"] == 1 and c["stylizedExportVariants"] == 2
        assert c["downloadStatuses"]["rate_limited"] == 1
        # Resume selecting an already acquired MCP UID never calls acquire.
        with mock.patch.object(sys, "argv", [*args, "--uid", uids[0]]), mock.patch.dict(os.environ, {"SKETCHFAB_API_TOKEN": "fixture-not-a-credential"}), mock.patch(__name__ + ".acquire", side_effect=AssertionError("Verified source was downloaded again")), contextlib.redirect_stdout(io.StringIO()):
            assert main() == 2  # Other inventory entries remain pending.
        # Corruption and receipt/path swaps fail closed and preserve history.
        item = copy.deepcopy(refreshed["models"][0])
        item["download"]["receipt"] = refreshed["models"][1]["download"]["receipt"]
        assert not verified_download(item, root)
        item = copy.deepcopy(refreshed["models"][0]); item["download"]["sourceGlb"] = "../../escape.glb"
        assert not verified_download(item, root)
        item = copy.deepcopy(refreshed["models"][0]); source = root / item["download"]["sourceGlb"]
        source.write_bytes(source.read_bytes()[:-1] + b"x")
        assert not needs_acquisition(item, root, True, False)
        assert item["download"]["status"] == "verification_failed" and item["download"]["sourceGlb"]
        assert item["downloadHistory"][-1]["download"]["status"] == "downloaded"
        # A public-search omission and later reappearance retain source data.
        partial = catalogue({**snapshot, "results": snapshot["results"][1:]}, refreshed)
        assert partial["catalogueHistory"][0]["uid"] == uids[0]
        returned = catalogue(snapshot, partial)
        assert returned["models"][0]["download"] == refreshed["models"][0]["download"]
        prior429 = copy.deepcopy(limited["download"])
        set_download_record(limited, {"status": "pending_download"})
        assert limited["downloadHistory"][-1]["download"] == prior429


def self_test() -> None:
    """Local extraction/secret-handling checks; no network and no real sources."""
    import io
    import contextlib
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        archive = root / "sample.zip"
        with zipfile.ZipFile(archive, "w") as output:
            output.writestr("scene.gltf", '{"asset":{"version":"2.0"}}')
            output.writestr("textures/enamel.txt", "original")
        receipts = safe_extract(archive, root / "extracted", 10000)
        assert len(receipts) == 2 and all(len(item["sha256"]) == 64 for item in receipts)
        cases = [("../escape.txt", None), ("/absolute.txt", None), ("C:/drive.txt", None), ("folder\\escape.txt", None), ("link", (stat.S_IFLNK | 0o777) << 16)]
        for filename, mode in cases:
            with zipfile.ZipFile(archive, "w") as output:
                member = zipfile.ZipInfo(filename)
                if mode is not None:
                    member.create_system = 3
                    member.external_attr = mode
                output.writestr(member, "bad")
            try:
                safe_extract(archive, root / "rejected", 10000)
                raise AssertionError("Unsafe archive was accepted")
            except ValueError:
                pass
            assert not (root / "rejected").exists()
        with zipfile.ZipFile(archive, "w") as output:
            output.writestr("oversized.txt", "x" * 1000)
        try:
            safe_extract(archive, root / "large", 100)
            raise AssertionError("Expansion limit was ignored")
        except ValueError:
            pass
        assert not allowed_archive_url("http://media.sketchfab.com/model.zip")
        assert not allowed_archive_url("https://localhost/model.zip")
        assert allowed_archive_url("https://sketchfab-prod-media.s3.amazonaws.com/archives/test.zip?token=ephemeral")
        assert license_assessment({"label": "CC Attribution-NonCommercial-NoDerivs"})["stylizationStatus"] == "license_review_required"
        private_nd = license_assessment({"label": "CC Attribution-NonCommercial-NoDerivs", "url": "http://creativecommons.org/licenses/by-nc-nd/4.0/"})
        assert private_nd["stylizationStatus"] == "private_noncommercial_study_only"
        assert private_nd["publicAdaptationEligibility"] == "not_permitted_without_separate_permission"
        assert license_assessment({"label": "CC Attribution-NonCommercial"})["nonCommercialOnly"]
        with contextlib.redirect_stdout(io.StringIO()):
            write_json(root / "receipt.json", {"ok": True})
        assert json.loads((root / "receipt.json").read_text()) == {"ok": True}
        model_directory = root / "vehicles" / ("a" * 32)
        model_directory.mkdir(parents=True)
        source = model_directory / "original.zip"
        source.write_bytes(b"original source archive")
        extracted = model_directory / "extracted"
        extracted.mkdir()
        (extracted / "model.gltf").write_text("original model")
        receipt = {"uid": "a" * 32, "archive": {"sha256": sha256(source)},
            "extractedDirectory": str(extracted.relative_to(root)),
            "files": [{"path": "model.gltf", "sha256": sha256(extracted / "model.gltf")}]}
        write_json(model_directory / "download-receipt.json", receipt)
        item = {"uid": "a" * 32, "download": {"status": "downloaded", "archive": str(source.relative_to(root)),
            "receipt": str((model_directory / "download-receipt.json").relative_to(root))}}
        assert verified_download(item, root)
        (extracted / "model.gltf").write_text("changed model")
        assert not verified_download(item, root)
        item["download"]["receipt"] = "../../elsewhere.json"
        assert not verified_download(item, root)
    catalogue_self_test()
    print("Self-test passed: archive safety, MCP source verification, offline refresh/resume preservation, integrity failures, acquisition history and private/public license scope.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=SOURCE / "sketchfab-search.json")
    parser.add_argument("--output", type=Path, default=SOURCE)
    parser.add_argument("--catalog-only", action="store_true", help="Refresh the inventory without network access")
    parser.add_argument("--auth-scheme", choices=("Token", "Bearer"), default="Token", help="Token for a personal API token; Bearer for an OAuth access token")
    parser.add_argument("--uid", action="append", default=[], help="Process only this UID; repeat to select several")
    parser.add_argument("--max-archive-mib", type=int, default=1024)
    parser.add_argument("--max-extracted-mib", type=int, default=2048)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.max_archive_mib <= 0 or args.max_extracted_mib <= 0:
        raise ValueError("Archive byte limits must be positive.")
    if args.self_test:
        self_test()
        return 0
    output = args.output.resolve()
    manifest_path = output / "vehicle-manifest.json"
    existing = json.loads(manifest_path.read_text()) if manifest_path.exists() else None
    manifest = catalogue(json.loads(args.snapshot.read_text()), existing)
    token = os.environ.get("SKETCHFAB_API_TOKEN", "").strip()
    if "\r" in token or "\n" in token:
        raise ValueError("Configured token has an invalid format.")
    requested = set(args.uid)
    if requested - {item["uid"] for item in manifest["models"]}:
        raise ValueError("A requested UID is absent from the reviewed search snapshot.")
    manifest["sourceSnapshotSha256"] = sha256(args.snapshot)
    manifest["sourceSnapshot"] = args.snapshot.name
    manifest["cliAuthentication"] = {"configured": bool(token), "scheme": args.auth_scheme, "checkedAt": utc_now()}
    if not manifest.get("authenticationProvider") or manifest["authenticationProvider"] == "official_api_cli":
        manifest["authenticationConfigured"] = bool(token)
        manifest["authenticationProvider"] = "official_api_cli"
        manifest["authScheme"] = args.auth_scheme
    for item in manifest["models"]:
        if not item["classification"]["included"]:
            continue
        read_only = args.catalog_only or bool(requested and item["uid"] not in requested)
        if not needs_acquisition(item, output, read_only, bool(token)):
            continue
        try:
            acquire(item, output, token, args.auth_scheme, args.max_archive_mib * 1024**2, args.max_extracted_mib * 1024**2)
        except urllib.error.HTTPError as error:
            # Never serialize error bodies/URLs: they can contain signed URLs.
            status = "authentication_rejected" if error.code == 401 else "permission_denied" if error.code == 403 else "rate_limited" if error.code == 429 else "download_failed"
            set_download_record(item, {"status": status, "method": "official_api_cli", "httpStatus": error.code, "archive": None, "receipt": None})
        except (OSError, ValueError, zipfile.BadZipFile, RuntimeError):
            set_download_record(item, {"status": "download_failed", "method": "official_api_cli", "reason": "Official download or archive validation failed; no unverified files were approved.", "archive": None, "receipt": None})
        manifest["updatedAt"] = utc_now()
        manifest["counts"] = counts(manifest)
        write_json(manifest_path, manifest)
        if item["download"]["status"] in ("authentication_rejected", "rate_limited"):
            break
    manifest["counts"] = counts(manifest)
    write_json(manifest_path, manifest)
    print(json.dumps(manifest["counts"], indent=2))
    return 0 if manifest["counts"]["blockedOrPending"] == 0 or args.catalog_only else 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, TypeError):
        # Do not accidentally leak a credential or expiring media URL in a traceback.
        print("Asset ingestion stopped: invalid configuration, metadata or filesystem state.", file=sys.stderr)
        sys.exit(1)
