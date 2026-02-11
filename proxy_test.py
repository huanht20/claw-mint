import requests

proxies = [
    'http://gmvjgsol:482ax6w3fy31@45.43.184.205:5879',
    'http://gmvjgsol:482ax6w3fy31@64.137.103.144:6732',
    'http://gmvjgsol:482ax6w3fy31@93.120.32.234:9418',
    'http://gmvjgsol:482ax6w3fy31@176.116.230.89:7175',
    'http://gmvjgsol:482ax6w3fy31@216.74.118.136:6291',
    'http://gmvjgsol:482ax6w3fy31@154.85.124.154:6015',
    'http://gmvjgsol:482ax6w3fy31@216.173.123.7:6382',
    'http://gmvjgsol:482ax6w3fy31@64.137.124.32:6244',
    'http://gmvjgsol:482ax6w3fy31@37.35.42.71:8673',
    'http://gmvjgsol:482ax6w3fy31@45.67.2.102:5676',
    'http://gmvjgsol:482ax6w3fy31@64.137.75.198:6118',
    'http://gmvjgsol:482ax6w3fy31@104.143.226.89:5692',
    'http://gmvjgsol:482ax6w3fy31@64.137.70.87:5638',
    'http://gmvjgsol:482ax6w3fy31@64.137.124.107:6319',
    'http://gmvjgsol:482ax6w3fy31@104.239.44.5:5927',
    'http://gmvjgsol:482ax6w3fy31@38.170.169.94:5335',
    'http://gmvjgsol:482ax6w3fy31@43.229.11.203:5841',
    'http://gmvjgsol:482ax6w3fy31@161.123.154.227:6757',
    'http://gmvjgsol:482ax6w3fy31@206.41.172.132:6692',
    'http://gmvjgsol:482ax6w3fy31@64.137.92.171:6370',
    'http://gmvjgsol:482ax6w3fy31@206.41.164.81:6380',
    'http://gmvjgsol:482ax6w3fy31@64.137.83.197:6137',
    'http://gmvjgsol:482ax6w3fy31@154.92.112.222:5243',
    'http://gmvjgsol:482ax6w3fy31@198.23.128.128:5756',
]

for p in proxies:
    try:
        r = requests.get(
            "https://api.ipify.org?format=json",
            proxies={"http": p, "https": p},
            timeout=8
        )
        print("LIVE ✅", p, "→", r.json()["ip"])
    except Exception as e:
        print("DIE ❌ ", p)