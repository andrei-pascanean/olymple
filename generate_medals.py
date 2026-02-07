#!/usr/bin/env python3
"""
Generates olympic-medals-v2.json from raw-olympic-data.csv.

Produces a JSON file keyed by NOC code with:
- Country name, code, flag emoji
- Total medal count
- Top 5 summer sports (by total medals) with gold/silver/bronze breakdown
- Top 5 winter sports (by total medals) with gold/silver/bronze breakdown
"""

import csv
import json
from collections import defaultdict

INPUT_CSV = "raw-olympic-data.csv"
FLAGS_JSON = "country-flags.json"
OUTPUT_JSON = "olympic-medals-v2.json"

# ---------------------------------------------------------------------------
# Mapping from CSV Discipline → aggregated sport name
# Sub-disciplines with a parent in parentheses are either grouped under the
# parent or kept separate, matching the convention in olympic-medals.json.
# ---------------------------------------------------------------------------
DISCIPLINE_TO_SPORT = {
    # Aquatics — keep each sub-discipline separate
    "Swimming (Aquatics)": "Swimming",
    "Diving (Aquatics)": "Diving",
    "Water Polo (Aquatics)": "Water Polo",
    "Artistic Swimming (Aquatics)": "Artistic Swimming",
    "Marathon Swimming (Aquatics)": "Marathon Swimming",
    # Skating — keep separate
    "Speed Skating (Skating)": "Speed Skating",
    "Figure Skating (Skating)": "Figure Skating",
    "Short Track Speed Skating (Skating)": "Short Track Speed Skating",
    # Skiing — keep separate
    "Alpine Skiing (Skiing)": "Alpine Skiing",
    "Cross Country Skiing (Skiing)": "Cross Country Skiing",
    "Freestyle Skiing (Skiing)": "Freestyle Skiing",
    "Ski Jumping (Skiing)": "Ski Jumping",
    "Nordic Combined (Skiing)": "Nordic Combined",
    "Snowboarding (Skiing)": "Snowboarding",
    "Military Ski Patrol (Skiing)": "Military Ski Patrol",
    # Bobsleigh — Skeleton is separate
    "Bobsleigh (Bobsleigh)": "Bobsleigh",
    "Skeleton (Bobsleigh)": "Skeleton",
    # Volleyball — Beach Volleyball is separate
    "Volleyball (Volleyball)": "Volleyball",
    "Beach Volleyball (Volleyball)": "Beach Volleyball",
    # Baseball / Softball — separate
    "Baseball (Baseball/Softball)": "Baseball",
    "Softball (Baseball/Softball)": "Softball",
    # Roller Sports — separate
    "Roller Skating (Roller Sports)": "Roller Skating",
    "Skateboarding (Roller Sports)": "Skateboarding",
    # Gymnastics — group into one
    "Artistic Gymnastics (Gymnastics)": "Gymnastics",
    "Rhythmic Gymnastics (Gymnastics)": "Gymnastics",
    "Trampolining (Gymnastics)": "Gymnastics",
    # Cycling — group into one
    "Cycling BMX Freestyle (Cycling)": "Cycling",
    "Cycling BMX Racing (Cycling)": "Cycling",
    "Cycling Mountain Bike (Cycling)": "Cycling",
    "Cycling Road (Cycling)": "Cycling",
    "Cycling Track (Cycling)": "Cycling",
    # Canoeing — group into one
    "Canoe Marathon (Canoeing)": "Canoeing",
    "Canoe Slalom (Canoeing)": "Canoeing",
    "Canoe Sprint (Canoeing)": "Canoeing",
    # Equestrian — group into one
    "Equestrian Dressage (Equestrian)": "Equestrian",
    "Equestrian Driving (Equestrian)": "Equestrian",
    "Equestrian Eventing (Equestrian)": "Equestrian",
    "Equestrian Jumping (Equestrian)": "Equestrian",
    "Equestrian Vaulting (Equestrian)": "Equestrian",
    # Basketball — group
    "Basketball (Basketball)": "Basketball",
    "3x3 Basketball (Basketball)": "Basketball",
    # Rugby — group
    "Rugby (Rugby)": "Rugby",
    "Rugby Sevens (Rugby)": "Rugby",
    # Football — strip parent
    "Football (Football)": "Football",
    # Ice Hockey — group
    "Ice Hockey (Ice Hockey)": "Ice Hockey",
    "3-on-3 Ice Hockey (Ice Hockey)": "Ice Hockey",
    # Hockey → Field Hockey (to distinguish from Ice Hockey)
    "Hockey": "Field Hockey",
    "Hockey 5s": "Field Hockey",
}

# ---------------------------------------------------------------------------
# Emoji per sport (matching olympic-medals.json conventions)
# ---------------------------------------------------------------------------
SPORT_EMOJI = {
    "Athletics": "🏃",
    "Swimming": "🏊",
    "Diving": "🤿",
    "Water Polo": "🤽",
    "Artistic Swimming": "🤽",
    "Marathon Swimming": "🏊",
    "Wrestling": "🤼",
    "Gymnastics": "🤸",
    "Cycling": "🚴",
    "Rowing": "🚣",
    "Fencing": "🤺",
    "Boxing": "🥊",
    "Shooting": "🎯",
    "Sailing": "⛵",
    "Canoeing": "🛶",
    "Equestrian": "🐎",
    "Weightlifting": "🏋️",
    "Football": "⚽",
    "Field Hockey": "🏑",
    "Basketball": "🏀",
    "Volleyball": "🏐",
    "Beach Volleyball": "🏐",
    "Tennis": "🎾",
    "Table Tennis": "🏓",
    "Handball": "🤾",
    "Judo": "🥋",
    "Taekwondo": "🥋",
    "Karate": "🥋",
    "Archery": "🏹",
    "Badminton": "🏸",
    "Rugby": "🏉",
    "Baseball": "⚾",
    "Softball": "🥎",
    "Modern Pentathlon": "🏅",
    "Triathlon": "🏊",
    "Alpine Skiing": "⛷️",
    "Cross Country Skiing": "🎿",
    "Freestyle Skiing": "⛷️",
    "Ski Jumping": "🎿",
    "Nordic Combined": "🎿",
    "Snowboarding": "🏂",
    "Biathlon": "🎿",
    "Speed Skating": "⛸️",
    "Figure Skating": "⛸️",
    "Short Track Speed Skating": "⛸️",
    "Ice Hockey": "🏒",
    "Bobsleigh": "🛷",
    "Luge": "🛷",
    "Skeleton": "🛷",
    "Curling": "🥌",
    "Golf": "⛳",
    "Surfing": "🏄",
    "Sport Climbing": "🧗",
    "Skateboarding": "🛹",
    "Ski Mountaineering": "⛷️",
    "Tug-Of-War": "🪢",
    "Lacrosse": "🥍",
    "Polo": "🐎",
    "Cricket": "🏏",
    "Croquet": "🏑",
    "Roller Skating": "🛼",
    "Military Ski Patrol": "🎿",
}

# ---------------------------------------------------------------------------
# NOC code → (country name, ISO alpha-2 for flag emoji)
# Covers all 156 NOCs that appear in the medal data.
# ---------------------------------------------------------------------------
NOC_INFO = {
    "AFG": ("Afghanistan", "AF"),
    "AHO": ("Curaçao", "CW"),
    "ALG": ("Algeria", "DZ"),
    "AND": ("Andorra", "AD"),
    "ANZ": ("Australasia", None),
    "ARG": ("Argentina", "AR"),
    "ARM": ("Armenia", "AM"),
    "AUS": ("Australia", "AU"),
    "AUT": ("Austria", "AT"),
    "AZE": ("Azerbaijan", "AZ"),
    "BAH": ("Bahamas", "BS"),
    "BAR": ("Barbados", "BB"),
    "BDI": ("Burundi", "BI"),
    "BEL": ("Belgium", "BE"),
    "BER": ("Bermuda", "BM"),
    "BIH": ("Bosnia and Herzegovina", "BA"),
    "BLR": ("Belarus", "BY"),
    "BOH": ("Bohemia", None),
    "BOT": ("Botswana", "BW"),
    "BRA": ("Brazil", "BR"),
    "BRN": ("Bahrain", "BH"),
    "BUL": ("Bulgaria", "BG"),
    "BUR": ("Burkina Faso", "BF"),
    "CAN": ("Canada", "CA"),
    "CHI": ("Chile", "CL"),
    "CHN": ("China", "CN"),
    "CIV": ("Ivory Coast", "CI"),
    "CMR": ("Cameroon", "CM"),
    "COL": ("Colombia", "CO"),
    "CRC": ("Costa Rica", "CR"),
    "CRO": ("Croatia", "HR"),
    "CUB": ("Cuba", "CU"),
    "CYP": ("Cyprus", "CY"),
    "CZE": ("Czech Republic", "CZ"),
    "DEN": ("Denmark", "DK"),
    "DJI": ("Djibouti", "DJ"),
    "DOM": ("Dominican Republic", "DO"),
    "ECU": ("Ecuador", "EC"),
    "EGY": ("Egypt", "EG"),
    "ERI": ("Eritrea", "ER"),
    "ESA": ("El Salvador", "SV"),
    "ESP": ("Spain", "ES"),
    "EST": ("Estonia", "EE"),
    "ETH": ("Ethiopia", "ET"),
    "EUN": ("Unified Team", None),
    "FIJ": ("Fiji", "FJ"),
    "FIN": ("Finland", "FI"),
    "FRA": ("France", "FR"),
    "FRG": ("West Germany", None),
    "GAB": ("Gabon", "GA"),
    "GBR": ("United Kingdom", "GB"),
    "GDR": ("East Germany", None),
    "GEO": ("Georgia", "GE"),
    "GER": ("Germany", "DE"),
    "GHA": ("Ghana", "GH"),
    "GRE": ("Greece", "GR"),
    "GRN": ("Grenada", "GD"),
    "GUA": ("Guatemala", "GT"),
    "GUY": ("Guyana", "GY"),
    "HAI": ("Haiti", "HT"),
    "HKG": ("Hong Kong", "HK"),
    "HUN": ("Hungary", "HU"),
    "INA": ("Indonesia", "ID"),
    "IND": ("India", "IN"),
    "IOA": ("Independent Olympic Athletes", None),
    "IRI": ("Iran", "IR"),
    "IRL": ("Ireland", "IE"),
    "IRQ": ("Iraq", "IQ"),
    "ISL": ("Iceland", "IS"),
    "ISR": ("Israel", "IL"),
    "ISV": ("U.S. Virgin Islands", "VI"),
    "ITA": ("Italy", "IT"),
    "JAM": ("Jamaica", "JM"),
    "JOR": ("Jordan", "JO"),
    "JPN": ("Japan", "JP"),
    "KAZ": ("Kazakhstan", "KZ"),
    "KEN": ("Kenya", "KE"),
    "KGZ": ("Kyrgyzstan", "KG"),
    "KOR": ("South Korea", "KR"),
    "KOS": ("Kosovo", "XK"),
    "KSA": ("Saudi Arabia", "SA"),
    "KUW": ("Kuwait", "KW"),
    "LAT": ("Latvia", "LV"),
    "LBN": ("Lebanon", "LB"),
    "LIE": ("Liechtenstein", "LI"),
    "LTU": ("Lithuania", "LT"),
    "LUX": ("Luxembourg", "LU"),
    "MAR": ("Morocco", "MA"),
    "MAS": ("Malaysia", "MY"),
    "MDA": ("Moldova", "MD"),
    "MEX": ("Mexico", "MX"),
    "MGL": ("Mongolia", "MN"),
    "MKD": ("North Macedonia", "MK"),
    "MNE": ("Montenegro", "ME"),
    "MON": ("Monaco", "MC"),
    "MOZ": ("Mozambique", "MZ"),
    "MRI": ("Mauritius", "MU"),
    "NAM": ("Namibia", "NA"),
    "NED": ("Netherlands", "NL"),
    "NGR": ("Nigeria", "NG"),
    "NIG": ("Niger", "NE"),
    "NOR": ("Norway", "NO"),
    "NZL": ("New Zealand", "NZ"),
    "PAK": ("Pakistan", "PK"),
    "PAN": ("Panama", "PA"),
    "PAR": ("Paraguay", "PY"),
    "PER": ("Peru", "PE"),
    "PHI": ("Philippines", "PH"),
    "POL": ("Poland", "PL"),
    "POR": ("Portugal", "PT"),
    "PRK": ("North Korea", "KP"),
    "PUR": ("Puerto Rico", "PR"),
    "QAT": ("Qatar", "QA"),
    "ROC": ("Russian Olympic Committee", "RU"),
    "ROU": ("Romania", "RO"),
    "RSA": ("South Africa", "ZA"),
    "RUS": ("Russia", "RU"),
    "SAM": ("Samoa", "WS"),
    "SCG": ("Serbia and Montenegro", None),
    "SEN": ("Senegal", "SN"),
    "SGP": ("Singapore", "SG"),
    "SLO": ("Slovenia", "SI"),
    "SMR": ("San Marino", "SM"),
    "SRB": ("Serbia", "RS"),
    "SRI": ("Sri Lanka", "LK"),
    "SUD": ("Sudan", "SD"),
    "SUI": ("Switzerland", "CH"),
    "SUR": ("Suriname", "SR"),
    "SVK": ("Slovakia", "SK"),
    "SWE": ("Sweden", "SE"),
    "SYR": ("Syria", "SY"),
    "TAN": ("Tanzania", "TZ"),
    "TCH": ("Czechoslovakia", None),
    "TGA": ("Tonga", "TO"),
    "THA": ("Thailand", "TH"),
    "TJK": ("Tajikistan", "TJ"),
    "TKM": ("Turkmenistan", "TM"),
    "TOG": ("Togo", "TG"),
    "TPE": ("Chinese Taipei", "TW"),
    "TTO": ("Trinidad and Tobago", "TT"),
    "TUN": ("Tunisia", "TN"),
    "TUR": ("Turkey", "TR"),
    "UAE": ("United Arab Emirates", "AE"),
    "UAR": ("United Arab Republic", None),
    "UGA": ("Uganda", "UG"),
    "UKR": ("Ukraine", "UA"),
    "URS": ("Soviet Union", None),
    "URU": ("Uruguay", "UY"),
    "USA": ("United States", "US"),
    "UZB": ("Uzbekistan", "UZ"),
    "VEN": ("Venezuela", "VE"),
    "VIE": ("Vietnam", "VN"),
    "WIF": ("West Indies Federation", None),
    "YUG": ("Yugoslavia", None),
    "ZAM": ("Zambia", "ZM"),
    "ZIM": ("Zimbabwe", "ZW"),
}

# Fallback flags for historical/special NOCs without an ISO alpha-2 code
SPECIAL_FLAGS = {
    "ANZ": "🇦🇺",  # Australasia (historical)
    "BOH": "🇨🇿",  # Bohemia → Czech Republic successor
    "EUN": "🏳️",   # Unified Team (1992)
    "FRG": "🇩🇪",  # West Germany
    "GDR": "🇩🇪",  # East Germany
    "IOA": "🏳️",   # Independent Olympic Athletes
    "SCG": "🇷🇸",  # Serbia and Montenegro → Serbia successor
    "TCH": "🇨🇿",  # Czechoslovakia → Czech Republic successor
    "UAR": "🇸🇾",  # United Arab Republic
    "URS": "🏳️",   # Soviet Union
    "WIF": "🏳️",   # West Indies Federation
    "YUG": "🇷🇸",  # Yugoslavia → Serbia successor
}


def alpha2_to_flag(code: str) -> str:
    """Convert ISO alpha-2 country code to flag emoji using regional indicators."""
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in code.upper())


def get_flag(noc: str) -> str:
    """Get flag emoji for a NOC code."""
    if noc in SPECIAL_FLAGS:
        return SPECIAL_FLAGS[noc]
    _, alpha2 = NOC_INFO.get(noc, (None, None))
    if alpha2:
        return alpha2_to_flag(alpha2)
    return "🏳️"


def resolve_sport(discipline: str) -> str:
    """Map a CSV Discipline value to the aggregated sport name."""
    if discipline in DISCIPLINE_TO_SPORT:
        return DISCIPLINE_TO_SPORT[discipline]
    # Fallback: use the discipline name as-is (covers standalone sports
    # like Athletics, Fencing, Judo, etc.)
    return discipline


def detect_season(games: str) -> str | None:
    """Return 'summer' or 'winter' from the Games column, or None to skip.

    Only includes standard Olympic Games. Excludes Youth Olympics,
    Intercalated Games, Equestrian Olympics, and other non-standard events.
    """
    if games.endswith(" Summer Olympics"):
        return "summer"
    if games.endswith(" Winter Olympics"):
        return "winter"
    return None


def main():
    # ------------------------------------------------------------------
    # Pass 1: aggregate medals by (NOC, season, sport, medal_type)
    # Deduplicate by (Games, Event, NOC) so team events count as one
    # medal, not one per athlete.
    # ------------------------------------------------------------------
    # stats[noc][season][sport] = {"Gold": 0, "Silver": 0, "Bronze": 0}
    stats = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"Gold": 0, "Silver": 0, "Bronze": 0})))
    seen = set()

    with open(INPUT_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            medal = row["Medal"]
            if medal not in ("Gold", "Silver", "Bronze"):
                continue

            noc = row["NOC"]
            season = detect_season(row["Games"])
            if season is None:
                continue

            # Deduplicate: one medal per (Games, Event, NOC, Medal)
            key = (row["Games"], row["Event"], noc, medal)
            if key in seen:
                continue
            seen.add(key)

            sport = resolve_sport(row["Discipline"])
            stats[noc][season][sport][medal] += 1

    # ------------------------------------------------------------------
    # Pass 2: build output JSON
    # ------------------------------------------------------------------
    output = {}

    for noc in sorted(stats.keys()):
        name, _ = NOC_INFO.get(noc, (noc, None))
        flag = get_flag(noc)

        total_medals = 0
        entry = {
            "name": name,
            "code": noc,
            "flag": flag,
            "totalMedals": 0,
            "summer": [],
            "winter": [],
        }

        for season in ("summer", "winter"):
            sports = stats[noc].get(season, {})
            # Sort by total medals descending, take top 5
            ranked = sorted(
                sports.items(),
                key=lambda item: sum(item[1].values()),
                reverse=True,
            )[:5]

            for sport_name, counts in ranked:
                sport_total = counts["Gold"] + counts["Silver"] + counts["Bronze"]
                total_medals += sport_total
                entry[season].append({
                    "sport": sport_name,
                    "emoji": SPORT_EMOJI.get(sport_name, "🏅"),
                    "gold": counts["Gold"],
                    "silver": counts["Silver"],
                    "bronze": counts["Bronze"],
                })

        # totalMedals = sum of ALL medals across ALL sports (not just top 5)
        total_all = 0
        for season in ("summer", "winter"):
            for counts in stats[noc][season].values():
                total_all += sum(counts.values())
        entry["totalMedals"] = total_all

        output[noc] = entry

    # ------------------------------------------------------------------
    # Write output
    # ------------------------------------------------------------------
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(output)} countries to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
