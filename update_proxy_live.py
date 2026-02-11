import requests
import json
import re
import os

# Đọc file config.js
config_file = 'config.js'

def read_config():
    """Đọc danh sách proxy từ config.js"""
    with open(config_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Tìm PROXY_LIST trong file
    # Pattern: export const PROXY_LIST = [ ... ];
    pattern = r'export const PROXY_LIST = \[(.*?)\];'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print("❌ Không tìm thấy PROXY_LIST trong config.js")
        return None, content
    
    proxy_list_str = match.group(1)
    
    # Extract các proxy strings
    proxy_pattern = r'["\']([^"\']+)["\']'
    proxies = re.findall(proxy_pattern, proxy_list_str)
    
    return proxies, content

def check_proxy(proxy, timeout=8):
    """Check proxy có live không"""
    try:
        r = requests.get(
            "https://ipinfo.io/ip",
            proxies={"http": proxy, "https": proxy},
            timeout=timeout
        )
        ip = r.text.strip()
        # Verify IP từ proxy
        proxy_ip = proxy.split('@')[1].split(':')[0] if '@' in proxy else proxy.split('://')[1].split(':')[0]
        return True, ip
    except Exception as e:
        return False, None

def update_config(proxies, original_content):
    """Update PROXY_LIST trong config.js với danh sách proxy live"""
    # Tạo string cho PROXY_LIST mới
    proxy_list_str = '[\n'
    for i, proxy in enumerate(proxies):
        proxy_list_str += f"    '{proxy}'"
        if i < len(proxies) - 1:
            proxy_list_str += ','
        proxy_list_str += '\n'
    proxy_list_str += ']'
    
    # Replace PROXY_LIST trong content
    pattern = r'export const PROXY_LIST = \[.*?\];'
    new_content = re.sub(pattern, f'export const PROXY_LIST = {proxy_list_str};', original_content, flags=re.DOTALL)
    
    # Backup file cũ
    backup_file = config_file + '.backup'
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(original_content)
    print(f"📦 Đã backup config.js thành {backup_file}")
    
    # Write file mới
    with open(config_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ Đã update {len(proxies)} proxy live vào config.js")

def main():
    print("🔍 Bắt đầu check proxy live...\n")
    
    # Đọc proxy từ config.js
    proxies, original_content = read_config()
    
    if not proxies:
        print("❌ Không có proxy để check")
        return
    
    print(f"📋 Tìm thấy {len(proxies)} proxy trong config.js\n")
    
    # Check từng proxy
    live_proxies = []
    dead_proxies = []
    
    for i, proxy in enumerate(proxies, 1):
        print(f"[{i}/{len(proxies)}] Đang check: {proxy[:50]}...", end=' ')
        is_live, ip = check_proxy(proxy)
        
        if is_live:
            print(f"✅ LIVE → {ip}")
            live_proxies.append(proxy)
        else:
            print("❌ DIE")
            dead_proxies.append(proxy)
    
    print(f"\n📊 Kết quả:")
    print(f"   ✅ Live: {len(live_proxies)}")
    print(f"   ❌ Die: {len(dead_proxies)}")
    
    if live_proxies:
        print(f"\n🔄 Đang update {len(live_proxies)} proxy live vào config.js...")
        update_config(live_proxies, original_content)
        print(f"\n✅ Hoàn tất! Đã update {len(live_proxies)} proxy live.")
    else:
        print("\n⚠️  Không có proxy live nào để update!")

if __name__ == '__main__':
    main()

