"""English catalogue labels; IDs and user-authored content are never translated."""
import re
from functools import cache

BRANDS = {
    'Barkas (Баркас)': 'Barkas', 'Nysa (Ниса)': 'Nysa', 'ЄРАЗ': 'ErAZ',
    'ІЖ': 'Izh', 'Богдан': 'Bogdan', 'Бронто': 'Bronto', 'ВАЗ / Lada': 'VAZ / Lada',
    'ГАЗ': 'GAZ', 'ГолАЗ': 'GolAZ', 'Жук': 'Zuk', 'ЗІЛ': 'ZIL', 'ЗАЗ': 'ZAZ',
    'ЗИМ': 'ZIM', 'ЗИС': 'ZIS', 'ЛуАЗ': 'LuAZ', 'Москвич/АЗЛК': 'Moskvich / AZLK',
    'РАФ': 'RAF', 'Ретро автомобілі': 'Classic cars', 'СМЗ': 'SMZ',
    'СПЭВ / SPEV': 'SPEV', 'Саморобний': 'Custom-built', 'СеАЗ': 'SeAZ',
    'ТагАЗ': 'TagAZ', 'ТогАЗ': 'TogAZ', 'Тренер': 'Trener', 'УАЗ': 'UAZ',
    'Циклон': 'Cyclone', 'Эстония': 'Estonia',
}
WORDS = {
    'Таврія': 'Tavria', 'Нова': 'Nova', 'Славута': 'Slavuta', 'Дана': 'Dana',
    'Ока': 'Oka', 'Калина': 'Kalina', 'Чайка': 'Chaika', 'Волга': 'Volga',
    'Надежда': 'Nadezhda', 'Нива': 'Niva', 'Комби': 'Kombi', 'Ода': 'Oda',
    'Орбита': 'Orbita', 'Кедр': 'Kedr', 'Князь Владимир': 'Knyaz Vladimir',
    'Баргузин': 'Barguzin', 'Соболь': 'Sobol', 'Бізон': 'Bizon', 'Атаман': 'Ataman',
    'Газель': 'Gazelle', 'Барс': 'Bars', 'Симбир': 'Simbir', 'Симбір': 'Simbir',
    'Сімба': 'Simba', 'Фермер': 'Farmer', 'Волинь': 'Volyn', 'Буян': 'Buyan',
    'Класичні': 'Classic', 'Перемога': 'Pobeda', 'Максус': 'Maxus', 'Рись': 'Rys',
    'Саморобний авто': 'Custom-built car', 'Хот-род': 'Hot rod', 'военный': 'Military',
    'Спутник': 'Sputnik', 'Самара': 'Samara', 'тест': 'Test',
    'двери': 'doors', 'ГБО': 'LPG', 'СУГ': 'LPG', 'СПГ': 'CNG',
    'АКПП': 'AT', 'МКПП': 'MT', 'РКПП': 'AMT', 'РКП': 'AMT', 'КПП': 'Transmission',
    'Дуэт': 'Duet', 'Газ': 'Gas', 'Санитарный': 'Ambulance',
    'Тентованый': 'Canvas-covered', 'Тент': 'Canvas top', 'Борт': 'Dropside',
    'Удлиненная': 'Long-wheelbase', 'Удлиненный': 'Long-wheelbase',
    'подовжена': 'Long-wheelbase', 'Подовжена': 'Long-wheelbase',
    'Тарзан': 'Tarzan', 'кабина': 'cab', 'Консул': 'Consul', 'Пляж': 'Beach',
    'Економ': 'Economy', 'Автоэвакуатор': 'Tow truck', 'спальник': 'sleeper',
    'Газон': 'Gazon', 'Изотермический': 'Insulated van', 'Молоковоз': 'Milk tanker',
    'Скорая помощь': 'Ambulance', 'Тайга': 'Taiga', 'Хлебный': 'Bread van',
    'Цельнометаллический': 'Panel van', 'пасс': 'Passenger', 'пас': 'Passenger',
    'кВт': 'kW', 'км': 'km', 'мм': 'mm', 'л': 'L',
}
TRANSLIT = dict(zip(
    'абвгґдеєжзиіїйклмнопрстуфхцчшщъыьэюя',
    ['a','b','v','g','g','d','e','ye','zh','z','i','i','yi','y','k','l','m','n','o','p','r','s','t','u','f','kh','ts','ch','sh','shch','','y','','e','yu','ya']
))
# Cyrillic lookalikes appear inside engine/transmission and chassis codes.
CODES = str.maketrans({'А':'A','В':'B','С':'C','Е':'E','І':'I','К':'K','М':'M','Н':'H','О':'O','Р':'P','Т':'T','Х':'X','а':'a','е':'e','і':'i','с':'c','х':'x','м':'m'})


REPLACEMENTS = {**WORDS, **BRANDS}
WORD_PATTERN = re.compile(r"(?<![\w])(?:" + "|".join(re.escape(k) for k in sorted(REPLACEMENTS, key=len, reverse=True)) + r")(?![\w])")

@cache
def english_text(value):
    value = value.strip()
    if value in BRANDS:
        return BRANDS[value]
    value = re.sub(r'покол[іi](?:ння|ния)', 'Generation', value, flags=re.I)
    value = re.sub(r'рестайл[іi]нг', 'Facelift', value, flags=re.I)
    value = re.sub(r'(?<!\w)(?:к\s*\.?\s*с|л\s*\.?\s*с)\s*\.?(?!\w)', 'hp', value, flags=re.I)
    value = WORD_PATTERN.sub(lambda m: REPLACEMENTS[m[0]], value)
    value = re.sub(r'(?<=\d)\s*х\s*(?=\d)', 'x', value)
    # Preserve technical designations while converting Cyrillic lookalikes.
    value = re.sub(r'[^\W_]+', lambda m: m[0].translate(CODES) if any(c.isdigit() for c in m[0]) or m[0].isupper() or m[0] in ('м', 'е') else m[0], value)
    def transliterate(match):
        text = match[0]
        result = ''.join(TRANSLIT.get(c.lower(), c).upper() if c.isupper() and text.isupper() else TRANSLIT.get(c.lower(), c).capitalize() if c.isupper() else TRANSLIT.get(c, c) for c in text)
        return result
    return re.sub(r'[\u0400-\u04ff]+', transliterate, value)
